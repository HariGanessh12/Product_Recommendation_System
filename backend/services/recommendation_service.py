from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from models import db
from bson import ObjectId
import pickle
import os
from datetime import datetime
import time


class RecommendationService:
    def __init__(self):
        # Use a pre-trained S-BERT model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.embeddings_cache = {}
        self.personalized_cache = {}
        self.cache_file = 'product_embeddings_cache.pkl'
        self.collaborative_weight = 0.4
        self.content_weight = 0.4
        self.popularity_weight = 0.2
        self.load_embeddings_cache()
    
    def load_embeddings_cache(self):
        """Load cached embeddings from file"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'rb') as f:
                    self.embeddings_cache = pickle.load(f)
                print(f"200 OK - Loaded {len(self.embeddings_cache)} cached embeddings")
        except Exception as e:
            print(f"500 ERROR - Failed to load embeddings cache: {e}")
            self.embeddings_cache = {}
    
    def save_embeddings_cache(self):
        """Save embeddings to file for faster loading"""
        try:
            with open(self.cache_file, 'wb') as f:
                pickle.dump(self.embeddings_cache, f)
            # Only log when significant changes occur
        except Exception as e:
            print(f"500 ERROR - Failed to save embeddings cache: {e}")
    
    def generate_product_text(self, product):
        """Generate comprehensive text representation of product for better semantic understanding"""
        text_parts = [
            product.get('name', ''),
            product.get('description', ''),
            product.get('category', ''),
            ' '.join(product.get('tags', []))
        ]
        
        specs = product.get('specifications', {})
        if specs:
            spec_text = ' '.join([f"{k} {v}" for k, v in specs.items()])
            text_parts.append(spec_text)
        
        return ' '.join(filter(None, text_parts))
    
    def get_product_embedding(self, product):
        """Get or generate embedding for a product with caching"""
        product_id = str(product.get('_id'))
        
        if product_id in self.embeddings_cache:
            return self.embeddings_cache[product_id]
        
        product_text = self.generate_product_text(product)
        embedding = self.model.encode(product_text, convert_to_tensor=False)
        
        self.embeddings_cache[product_id] = embedding
        return embedding
    
    def generate_all_embeddings(self):
        """Generate embeddings for all active products"""
        try:
            products = list(db.products.find({'is_active': True}))
            print(f"200 OK - Generating embeddings for {len(products)} products")
            
            for product in products:
                self.get_product_embedding(product)
            
            self.save_embeddings_cache()
            print("200 OK - All embeddings generated successfully")
            return True
        except Exception as e:
            print(f"500 ERROR - Failed to generate embeddings: {e}")
            return False
    
    def get_similar_products(self, product_id, top_n=10, min_similarity=0.3):
        """Find similar products using S-BERT embeddings"""
        try:
            target_product = db.products.find_one({
                '_id': ObjectId(product_id),
                'is_active': True
            })
            
            if not target_product:
                return []
            
            target_embedding = self.get_product_embedding(target_product)
            other_products = list(db.products.find({
                '_id': {'$ne': ObjectId(product_id)},
                'is_active': True
            }))
            
            if not other_products:
                return []
            
            similarities = []
            
            for product in other_products:
                product_embedding = self.get_product_embedding(product)
                similarity = cosine_similarity(
                    [target_embedding],
                    [product_embedding]
                )[0][0]
                
                if similarity >= min_similarity:
                    explanation = self.generate_explanation(
                        target_product, 
                        product, 
                        similarity
                    )
                    
                    similarities.append({
                        'product': product,
                        'similarity_score': float(similarity),
                        'explanation': explanation
                    })
            
            similarities.sort(key=lambda x: x['similarity_score'], reverse=True)
            return similarities[:top_n]
            
        except Exception as e:
            print(f"500 ERROR - Failed to find similar products: {e}")
            return []
    
    def generate_explanation(self, target_product, similar_product, similarity_score):
        """Generate human-readable explanation for product similarity"""
        explanations = []
        
        if target_product.get('category') == similar_product.get('category'):
            explanations.append(f"Same category: {target_product.get('category')}")
        
        target_price = target_product.get('price', 0)
        similar_price = similar_product.get('price', 0)
        price_diff_percent = abs(target_price - similar_price) / target_price * 100 if target_price > 0 else 0
        
        if price_diff_percent < 20:
            explanations.append(f"Similar price range (within {price_diff_percent:.0f}%)")
        
        target_tags = set(target_product.get('tags', []))
        similar_tags = set(similar_product.get('tags', []))
        common_tags = target_tags.intersection(similar_tags)
        
        if common_tags:
            explanations.append(f"Common features: {', '.join(list(common_tags)[:3])}")
        
        if similarity_score >= 0.7:
            explanations.append("Very similar product descriptions")
        elif similarity_score >= 0.5:
            explanations.append("Similar product characteristics")
        else:
            explanations.append("Related product features")
        
        return ' | '.join(explanations) if explanations else f"Similarity score: {similarity_score:.2f}"
    
    def clear_user_cache(self, user_id):
        """Clear cached recommendations for a user"""
        try:
            user_id_str = str(user_id)
            if user_id_str in self.personalized_cache:
                del self.personalized_cache[user_id_str]
        except Exception as e:
            print(f"500 ERROR - Failed to clear cache for user {user_id}: {e}")
    
    def get_enhanced_personalized_recommendations(self, user_id, top_n=10):
        """Enhanced personalized recommendations with real-time user behavior"""
        try:
            user_id_str = str(user_id)
            
            # Check cache first (5 minute TTL)
            if user_id_str in self.personalized_cache:
                cached_data = self.personalized_cache[user_id_str]
                cached_time = cached_data.get('timestamp', 0)
                if time.time() - cached_time < 300:  # 5 minutes
                    return cached_data['recommendations']

            # Get user's recent cart items
            recent_cart = list(db.cart.find({'user_id': user_id}).limit(10))
            cart_product_ids = [item['product_id'] for item in recent_cart]
            
            # Get user's wishlist from recommendations collection
            user_prefs = db.recommendations.find_one({'user_id': user_id}) or {}
            wishlist_ids = [ObjectId(pid) for pid in user_prefs.get('wishlist', [])]
            
            # Combine user interests
            all_interest_ids = list(set(cart_product_ids + wishlist_ids))
            
            if not all_interest_ids:
                return self.get_popular_products(top_n)
            
            # Get products user is interested in
            interest_products = list(db.products.find({
                '_id': {'$in': all_interest_ids},
                'is_active': True
            }))
            
            # Use S-BERT to find similar products
            all_recommendations = {}
            
            for product in interest_products:
                similar = self.get_similar_products(
                    str(product['_id']),
                    top_n=8,
                    min_similarity=0.2
                )
                
                for item in similar:
                    product_id = str(item['product']['_id'])
                    
                    if ObjectId(product_id) in all_interest_ids:
                        continue
                    
                    if product_id in all_recommendations:
                        all_recommendations[product_id]['score'] += item['similarity_score']
                        all_recommendations[product_id]['count'] += 1
                    else:
                        all_recommendations[product_id] = {
                            'product': item['product'],
                            'score': item['similarity_score'],
                            'count': 1,
                            'explanation': item['explanation']
                        }
            
            # Sort by score and count
            sorted_recs = sorted(
                all_recommendations.values(),
                key=lambda x: (x['count'], x['score']),
                reverse=True
            )[:top_n]
            
            # Cache results
            self.personalized_cache[user_id_str] = {
                'recommendations': sorted_recs,
                'timestamp': time.time()
            }
            
            return sorted_recs
            
        except Exception as e:
            print(f"500 ERROR - Failed to generate personalized recommendations: {e}")
            return self.get_popular_products(top_n)
    
    def get_personalized_recommendations(self, user_id, top_n=10):
        """Get personalized recommendations based on user behavior"""
        return self.get_enhanced_personalized_recommendations(user_id, top_n)
    
    def get_hybrid_personalized_recommendations(self, user_id, top_n=10):
        """Hybrid personalized recommendations combining content-based and popularity"""
        try:
            content_recs = self.get_enhanced_personalized_recommendations(user_id, top_n)
            
            # Format for hybrid response (add hybrid_score field)
            for rec in content_recs:
                rec['hybrid_score'] = rec['score'] * self.content_weight + \
                                    (rec['product'].get('rating', 0) / 5.0) * self.popularity_weight
                rec['content_score'] = rec['score']
                rec['popularity_score'] = rec['product'].get('rating', 0) / 5.0
                rec['cf_score'] = 0  # Will be added when CF is fixed
            
            return content_recs
            
        except Exception as e:
            print(f"500 ERROR - Failed to generate hybrid recommendations: {e}")
            return self.get_popular_products(top_n)

    def get_popular_products(self, top_n=10):
        """Get popular products based on ratings and wishlist count"""
        try:
            products = list(db.products.find({
                'is_active': True
            }).sort([
                ('rating', -1),
                ('wishlist_count', -1)
            ]).limit(top_n))
            
            return [{
                'product': product,
                'score': product.get('rating', 0),
                'count': 1,
                'explanation': 'Popular product with high ratings'
            } for product in products]
            
        except Exception as e:
            print(f"500 ERROR - Failed to get popular products: {e}")
            return []
    
    def update_product_embedding(self, product_id):
        """Update embedding for a specific product"""
        try:
            product = db.products.find_one({'_id': ObjectId(product_id)})
            if product:
                if str(product_id) in self.embeddings_cache:
                    del self.embeddings_cache[str(product_id)]
                
                self.get_product_embedding(product)
                self.save_embeddings_cache()
                return True
        except Exception as e:
            print(f"500 ERROR - Failed to update product embedding: {e}")
        
        return False


# Create singleton instance
recommendation_service = RecommendationService()

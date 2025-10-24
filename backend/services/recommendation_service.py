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
        self.personalized_cache = {}  # NEW: Cache for personalized recommendations
        self.cache_file = 'product_embeddings_cache.pkl'
        self.load_embeddings_cache()
    
    def load_embeddings_cache(self):
        """Load cached embeddings from file"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'rb') as f:
                    self.embeddings_cache = pickle.load(f)
                print(f"Loaded {len(self.embeddings_cache)} cached embeddings")
        except Exception as e:
            print(f"Error loading embeddings cache: {e}")
            self.embeddings_cache = {}
    
    def save_embeddings_cache(self):
        """Save embeddings to file for faster loading"""
        try:
            with open(self.cache_file, 'wb') as f:
                pickle.dump(self.embeddings_cache, f)
            print(f"Saved {len(self.embeddings_cache)} embeddings to cache")
        except Exception as e:
            print(f"Error saving embeddings cache: {e}")
    
    def generate_product_text(self, product):
        """
        Generate comprehensive text representation of product
        for better semantic understanding
        """
        text_parts = [
            product.get('name', ''),
            product.get('description', ''),
            product.get('category', ''),
            ' '.join(product.get('tags', []))
        ]
        
        # Add specifications if available
        specs = product.get('specifications', {})
        if specs:
            spec_text = ' '.join([f"{k} {v}" for k, v in specs.items()])
            text_parts.append(spec_text)
        
        return ' '.join(filter(None, text_parts))
    
    def get_product_embedding(self, product):
        """
        Get or generate embedding for a product
        Uses caching for performance
        """
        product_id = str(product.get('_id'))
        
        # Check cache first
        if product_id in self.embeddings_cache:
            return self.embeddings_cache[product_id]
        
        # Generate embedding
        product_text = self.generate_product_text(product)
        embedding = self.model.encode(product_text, convert_to_tensor=False)
        
        # Cache it
        self.embeddings_cache[product_id] = embedding
        
        return embedding
    
    def generate_all_embeddings(self):
        """
        Generate embeddings for all active products
        Useful for batch processing
        """
        try:
            products = list(db.products.find({'is_active': True}))
            print(f"Generating embeddings for {len(products)} products...")
            
            for product in products:
                self.get_product_embedding(product)
            
            self.save_embeddings_cache()
            print("All embeddings generated and cached")
            
            return True
        except Exception as e:
            print(f"Error generating embeddings: {e}")
            return False
    
    def get_similar_products(self, product_id, top_n=10, min_similarity=0.3):
        """
        Find similar products using S-BERT embeddings
        
        Args:
            product_id: ID of the target product
            top_n: Number of similar products to return
            min_similarity: Minimum similarity threshold (0-1)
        
        Returns:
            List of similar products with similarity scores and explanations
        """
        try:
            # Get target product
            target_product = db.products.find_one({
                '_id': ObjectId(product_id),
                'is_active': True
            })
            
            if not target_product:
                return []
            
            # Get target embedding
            target_embedding = self.get_product_embedding(target_product)
            
            # Get all other active products
            other_products = list(db.products.find({
                '_id': {'$ne': ObjectId(product_id)},
                'is_active': True
            }))
            
            if not other_products:
                return []
            
            # Calculate similarities
            similarities = []
            
            for product in other_products:
                product_embedding = self.get_product_embedding(product)
                
                # Calculate cosine similarity
                similarity = cosine_similarity(
                    [target_embedding],
                    [product_embedding]
                )[0][0]
                
                if similarity >= min_similarity:
                    # Generate explanation
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
            
            # Sort by similarity score
            similarities.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            # Return top N
            return similarities[:top_n]
            
        except Exception as e:
            print(f"Error getting similar products: {e}")
            return []
    
    def generate_explanation(self, target_product, similar_product, similarity_score):
        """
        Generate human-readable explanation for why products are similar
        This is the Explainable AI component
        """
        explanations = []
        
        # Category match
        if target_product.get('category') == similar_product.get('category'):
            explanations.append(f"Same category: {target_product.get('category')}")
        
        # Price similarity
        target_price = target_product.get('price', 0)
        similar_price = similar_product.get('price', 0)
        price_diff_percent = abs(target_price - similar_price) / target_price * 100 if target_price > 0 else 0
        
        if price_diff_percent < 20:
            explanations.append(f"Similar price range (within {price_diff_percent:.0f}%)")
        
        # Tag overlap
        target_tags = set(target_product.get('tags', []))
        similar_tags = set(similar_product.get('tags', []))
        common_tags = target_tags.intersection(similar_tags)
        
        if common_tags:
            explanations.append(f"Common features: {', '.join(list(common_tags)[:3])}")
        
        # Semantic similarity
        if similarity_score >= 0.7:
            explanations.append("Very similar product descriptions")
        elif similarity_score >= 0.5:
            explanations.append("Similar product characteristics")
        else:
            explanations.append("Related product features")
        
        return ' | '.join(explanations) if explanations else f"Similarity score: {similarity_score:.2f}"
    
    # NEW: Clear user cache method
    def clear_user_cache(self, user_id):
        """Clear cached recommendations for a user"""
        try:
            user_id_str = str(user_id)
            if user_id_str in self.personalized_cache:
                del self.personalized_cache[user_id_str]
                print(f"Cleared recommendation cache for user {user_id}")
        except Exception as e:
            print(f"Error clearing cache for user {user_id}: {e}")
    
    # NEW: Enhanced personalized recommendations
    def get_enhanced_personalized_recommendations(self, user_id, top_n=10):
        """
        Enhanced personalized recommendations with real-time user behavior
        Includes caching with TTL
        """
        try:
            user_id_str = str(user_id)
            
            # Check cache first (5 minute TTL)
            if user_id_str in self.personalized_cache:
                cached_data = self.personalized_cache[user_id_str]
                cached_time = cached_data.get('timestamp', 0)
                if time.time() - cached_time < 300:  # 5 minutes
                    print(f"Returning cached recommendations for user {user_id}")
                    return cached_data['recommendations']
            
            print(f"Generating fresh recommendations for user {user_id}")
            
            # Get user's recent cart items
            recent_cart = list(db.cart.find({'user_id': user_id}).limit(10))
            cart_product_ids = [item['product_id'] for item in recent_cart]
            
            # Get user's wishlist from recommendations collection
            user_prefs = db.recommendations.find_one({'user_id': user_id}) or {}
            wishlist_ids = [ObjectId(pid) for pid in user_prefs.get('wishlist', [])]
            
            # Combine user interests
            all_interest_ids = list(set(cart_product_ids + wishlist_ids))
            
            if not all_interest_ids:
                # Cold start - return popular products
                print(f"No user interests found, returning popular products")
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
                    
                    # Skip if already in user's interests
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
            
            print(f"Generated {len(sorted_recs)} recommendations for user {user_id}")
            return sorted_recs
            
        except Exception as e:
            print(f"Error getting enhanced personalized recommendations: {e}")
            return self.get_popular_products(top_n)
    
    # UPDATED: Use enhanced method as default
    def get_personalized_recommendations(self, user_id, top_n=10):
        """
        Get personalized recommendations based on user behavior
        Now uses enhanced method with caching
        """
        return self.get_enhanced_personalized_recommendations(user_id, top_n)
    
    def get_popular_products(self, top_n=10):
        """
        Get popular products based on ratings and wishlist count
        Fallback when no personalization data available
        """
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
            print(f"Error getting popular products: {e}")
            return []
    
    def update_product_embedding(self, product_id):
        """
        Update embedding for a specific product
        Call this when product details are updated
        """
        try:
            product = db.products.find_one({'_id': ObjectId(product_id)})
            if product:
                # Remove from cache to force regeneration
                if str(product_id) in self.embeddings_cache:
                    del self.embeddings_cache[str(product_id)]
                
                # Generate new embedding
                self.get_product_embedding(product)
                self.save_embeddings_cache()
                
                return True
        except Exception as e:
            print(f"Error updating product embedding: {e}")
        
        return False

# Create singleton instance
recommendation_service = RecommendationService()

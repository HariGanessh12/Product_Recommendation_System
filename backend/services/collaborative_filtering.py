import numpy as np
import scipy.sparse as sp
from scipy.sparse import coo_matrix, csr_matrix
from implicit.als import AlternatingLeastSquares
from bson import ObjectId
from models import db
import pickle
import os
from datetime import datetime, timedelta
import time


class CollaborativeFilteringService:
    def __init__(self):
        self.model = None
        self.user_index = {}
        self.product_index = {}
        self.index_to_user = {}
        self.index_to_product = {}
        self.interaction_matrix = None
        self.model_file = 'cf_model.pkl'
        self.mappings_file = 'cf_mappings.pkl'
        self.last_trained = None
        
        # Load existing model if available
        self.load_model()
    
    def build_interaction_matrix(self, min_interactions=1):
        """Build user-item interaction matrix from cart and wishlist data"""
        print("200 OK - Building interaction matrix")
        
        # Get active users and products
        user_docs = list(db.users.find({}, {"_id": 1}))
        user_ids = [str(u["_id"]) for u in user_docs]
        
        product_docs = list(db.products.find({"is_active": True}, {"_id": 1}))
        product_ids = [str(p["_id"]) for p in product_docs]
        
        # Create index mappings
        self.user_index = {uid: idx for idx, uid in enumerate(user_ids)}
        self.product_index = {pid: idx for idx, pid in enumerate(product_ids)}
        self.index_to_user = {idx: uid for uid, idx in self.user_index.items()}
        self.index_to_product = {idx: pid for pid, idx in self.product_index.items()}
        
        print(f"200 OK - Matrix built: {len(user_ids)} users, {len(product_ids)} products")
        
        rows, cols, vals = [], [], []
        
        # Process wishlist data (weight: 3.0)
        wishlist_count = 0
        for pref in db.recommendations.find({}, {"user_id": 1, "wishlist": 1}):
            uid = str(pref["user_id"])
            if uid not in self.user_index:
                continue
                
            uidx = self.user_index[uid]
            for pid in pref.get("wishlist", []):
                pid_s = str(pid)
                if pid_s not in self.product_index:
                    continue
                    
                pidx = self.product_index[pid_s]
                rows.append(uidx)
                cols.append(pidx)
                vals.append(3.0)  # Wishlist weight
                wishlist_count += 1
        
        # Process cart data (weight: 4.0)
        cart_count = 0
        for cart_item in db.cart.find({}, {"user_id": 1, "product_id": 1, "quantity": 1}):
            uid = str(cart_item["user_id"])
            pid = str(cart_item["product_id"])
            
            if uid not in self.user_index or pid not in self.product_index:
                continue
                
            uidx = self.user_index[uid]
            pidx = self.product_index[pid]
            
            # Use quantity as additional weight
            quantity = cart_item.get("quantity", 1)
            weight = 4.0 + min(quantity * 0.5, 2.0)  # Max additional weight of 2.0
            
            rows.append(uidx)
            cols.append(pidx)
            vals.append(weight)
            cart_count += 1
        
        print(f"200 OK - Interactions processed: {wishlist_count} wishlist, {cart_count} cart")
        
        # Create sparse matrix and aggregate duplicates
        self.interaction_matrix = coo_matrix(
            (vals, (rows, cols)), 
            shape=(len(user_ids), len(product_ids))
        ).tocsr()
        
        # Remove users/products with too few interactions
        user_interaction_counts = np.array(self.interaction_matrix.sum(axis=1)).flatten()
        product_interaction_counts = np.array(self.interaction_matrix.sum(axis=0)).flatten()
        
        valid_users = user_interaction_counts >= min_interactions
        valid_products = product_interaction_counts >= min_interactions
        
        # Filter matrix
        self.interaction_matrix = self.interaction_matrix[valid_users][:, valid_products]
        
        # Update mappings
        valid_user_ids = [user_ids[i] for i in range(len(user_ids)) if valid_users[i]]
        valid_product_ids = [product_ids[i] for i in range(len(product_ids)) if valid_products[i]]
        
        self.user_index = {uid: idx for idx, uid in enumerate(valid_user_ids)}
        self.product_index = {pid: idx for idx, pid in enumerate(valid_product_ids)}
        self.index_to_user = {idx: uid for uid, idx in self.user_index.items()}
        self.index_to_product = {idx: pid for pid, idx in self.product_index.items()}
        
        print(f"200 OK - Matrix finalized: shape {self.interaction_matrix.shape}, density {self.interaction_matrix.nnz / (self.interaction_matrix.shape[0] * self.interaction_matrix.shape[1]):.4f}")
        
        return self.interaction_matrix
    
    def train_model(self, factors=64, regularization=0.01, iterations=20, alpha=40):
        """Train Implicit ALS model"""
        if self.interaction_matrix is None:
            self.build_interaction_matrix()
        
        print(f"200 OK - Training ALS model with {factors} factors")
        
        # Implicit ALS expects item-user matrix (items x users)
        item_user_matrix = self.interaction_matrix.T.tocsr()
        
        # Apply confidence scaling
        confidence_matrix = (item_user_matrix * alpha).astype('double')
        
        # Initialize and train model
        self.model = AlternatingLeastSquares(
            factors=factors,
            regularization=regularization,
            iterations=iterations,
            random_state=42
        )
        
        start_time = time.time()
        self.model.fit(confidence_matrix)
        training_time = time.time() - start_time
        
        self.last_trained = datetime.utcnow()
        
        print(f"200 OK - Model training completed in {training_time:.2f} seconds")
        
        # Save model
        self.save_model()
        
        return self.model
    
    def get_user_recommendations(self, user_id, n_recommendations=10, filter_seen=True):
        """Get recommendations for a specific user"""
        if self.model is None:
            print("200 OK - Training CF model for first use")
            self.train_model()
        
        user_id_str = str(user_id)
        
        if user_id_str not in self.user_index:
            # User not in training data - return empty (not an error)
            return []
        
        user_idx = self.user_index[user_id_str]
        
        try:
            # Get recommendations from model
            recommendations = self.model.recommend(
                userid=user_idx,
                user_items=self.interaction_matrix[user_idx],
                N=n_recommendations,
                filter_already_liked_items=filter_seen
            )
                        
            # Convert to product info
            results = []
            for i, item in enumerate(recommendations):
                try:
                    # Handle different formats
                    if isinstance(item, tuple) and len(item) == 2:
                        product_idx, score = item
                    elif hasattr(item, 'item') and hasattr(item, 'score'):
                        product_idx, score = item.item, item.score
                    elif isinstance(item, (list, np.ndarray)) and len(item) >= 2:
                        product_idx, score = int(item[0]), float(item[1])
                    else:
                        continue  # Skip invalid items silently
                        
                except Exception:
                    continue  # Skip items that can't be processed
                
                # Check if product index exists in mapping
                if product_idx not in self.index_to_product:
                    continue  # Skip if mapping doesn't exist
                    
                product_id = self.index_to_product[product_idx]
                
                # Get product details
                try:
                    product = db.products.find_one({'_id': ObjectId(product_id)})
                    if product:
                        results.append({
                            'product': product,
                            'cf_score': float(score),
                            'explanation': f"Collaborative filtering based on similar users (score: {score:.3f})"
                        })
                except Exception:
                    continue  # Skip products that can't be retrieved
            
            if results:
                print(f"200 OK - CF recommendations generated: {len(results)} items")
            
            return results
                
        except Exception as e:
            # Silently handle CF errors since they're non-critical
            return []
    
    def get_similar_items(self, product_id, n_similar=10):
        """Get items similar to a given product using collaborative filtering"""
        if self.model is None:
            self.train_model()
        
        product_id_str = str(product_id)
        
        if product_id_str not in self.product_index:
            return []  # Product not in training data
        
        product_idx = self.product_index[product_id_str]
        
        try:
            # Get similar items
            similar_items = self.model.similar_items(
                itemid=product_idx,
                N=n_similar
            )
            
            results = []
            for similar_idx, score in similar_items:
                if similar_idx not in self.index_to_product:
                    continue
                    
                similar_product_id = self.index_to_product[similar_idx]
                
                # Get product details
                try:
                    product = db.products.find_one({'_id': ObjectId(similar_product_id)})
                    if product:
                        results.append({
                            'product': product,
                            'cf_score': float(score),
                            'explanation': f"Users who liked this also liked similar items (score: {score:.3f})"
                        })
                except Exception:
                    continue
            
            if results:
                print(f"200 OK - CF similar items found: {len(results)} items")
            
            return results
            
        except Exception:
            return []  # Silently handle errors
    
    def save_model(self):
        """Save trained model and mappings"""
        try:
            # Save model
            with open(self.model_file, 'wb') as f:
                pickle.dump(self.model, f)
            
            # Save mappings and matrix
            mappings = {
                'user_index': self.user_index,
                'product_index': self.product_index,
                'index_to_user': self.index_to_user,
                'index_to_product': self.index_to_product,
                'interaction_matrix': self.interaction_matrix,
                'last_trained': self.last_trained
            }
            
            with open(self.mappings_file, 'wb') as f:
                pickle.dump(mappings, f)
            
            print("200 OK - CF model and mappings saved successfully")
            
        except Exception as e:
            print(f"500 ERROR - Failed to save CF model: {e}")
    
    def load_model(self):
        """Load existing model and mappings"""
        try:
            if os.path.exists(self.model_file) and os.path.exists(self.mappings_file):
                # Load model
                with open(self.model_file, 'rb') as f:
                    self.model = pickle.load(f)
                
                # Load mappings
                with open(self.mappings_file, 'rb') as f:
                    mappings = pickle.load(f)
                
                self.user_index = mappings['user_index']
                self.product_index = mappings['product_index']
                self.index_to_user = mappings['index_to_user']
                self.index_to_product = mappings['index_to_product']
                self.interaction_matrix = mappings['interaction_matrix']
                self.last_trained = mappings.get('last_trained')
                
                print(f"200 OK - CF model loaded successfully. Last trained: {self.last_trained}")
                return True
                
        except Exception as e:
            print(f"500 ERROR - Failed to load CF model: {e}")
        
        return False
    
    def needs_retraining(self, max_age_hours=24):
        """Check if model needs retraining"""
        if self.model is None or self.last_trained is None:
            return True
        
        age = datetime.utcnow() - self.last_trained
        return age.total_seconds() > max_age_hours * 3600


# Create singleton instance
collaborative_filtering_service = CollaborativeFilteringService()

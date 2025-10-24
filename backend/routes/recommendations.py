from flask import Blueprint, request, jsonify
from middleware.auth import auth_required
from services.recommendation_service import recommendation_service
from services.collaborative_filtering import collaborative_filtering_service
from bson import ObjectId
from models import db
import os

recommendations_bp = Blueprint('recommendations', __name__)

@recommendations_bp.route('/similar/<product_id>', methods=['GET'])
def get_similar_products(product_id):
    """
    Get products similar to the specified product
    Query params:
        - limit: number of recommendations (default: 10)
        - min_similarity: minimum similarity threshold (default: 0.3)
    """
    try:
        limit = int(request.args.get('limit', 10))
        min_similarity = float(request.args.get('min_similarity', 0.3))
        
        # Get similar products
        similar_products = recommendation_service.get_similar_products(
            product_id,
            top_n=limit,
            min_similarity=min_similarity
        )
        
        # Format response
        recommendations = []
        for item in similar_products:
            product = item['product']
            recommendations.append({
                'id': str(product['_id']),
                'name': product['name'],
                'description': product['description'],
                'category': product['category'],
                'price': product['price'],
                'image_url': product['image_url'],
                'rating': product.get('rating', 0),
                'seller_name': product['seller_name'],
                'similarity_score': item['similarity_score'],
                'explanation': item['explanation']
            })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations),
            'algorithm': 'content_based'
        }), 200
        
    except Exception as e:
        print(f"Error in get_similar_products: {e}")
        return jsonify({'error': 'Failed to get recommendations'}), 500

@recommendations_bp.route('/personalized', methods=['GET'])
@auth_required
def get_personalized_recommendations():
    """
    Get personalized recommendations for the authenticated user
    Query params:
        - limit: number of recommendations (default: 10)
    """
    try:
        user_id = request.current_user_id
        limit = int(request.args.get('limit', 10))
        
        # Get personalized recommendations
        recommendations_data = recommendation_service.get_personalized_recommendations(
            user_id,
            top_n=limit
        )
        
        # Format response
        recommendations = []
        for item in recommendations_data:
            product = item['product']
            recommendations.append({
                'id': str(product['_id']),
                'name': product['name'],
                'description': product['description'],
                'category': product['category'],
                'price': product['price'],
                'image_url': product['image_url'],
                'rating': product.get('rating', 0),
                'seller_name': product['seller_name'],
                'recommendation_score': item['score'],
                'recommendation_strength': item['count'],
                'explanation': item['explanation']
            })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations),
            'algorithm': 'enhanced_content_based'
        }), 200
        
    except Exception as e:
        print(f"Error in get_personalized_recommendations: {e}")
        return jsonify({'error': 'Failed to get personalized recommendations'}), 500

@recommendations_bp.route('/generate-embeddings', methods=['POST'])
@auth_required
def generate_embeddings():
    """
    Generate embeddings for all products
    Admin only - used for initialization or updates
    """
    try:
        user = request.current_user
        
        if user['role'] != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403
        
        success = recommendation_service.generate_all_embeddings()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Embeddings generated successfully'
            }), 200
        else:
            return jsonify({'error': 'Failed to generate embeddings'}), 500
            
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        return jsonify({'error': 'Failed to generate embeddings'}), 500

@recommendations_bp.route('/popular', methods=['GET'])
def get_popular_products():
    """
    Get popular products (fallback recommendations)
    """
    try:
        limit = int(request.args.get('limit', 10))
        
        popular = recommendation_service.get_popular_products(top_n=limit)
        
        recommendations = []
        for item in popular:
            product = item['product']
            recommendations.append({
                'id': str(product['_id']),
                'name': product['name'],
                'description': product['description'],
                'category': product['category'],
                'price': product['price'],
                'image_url': product['image_url'],
                'rating': product.get('rating', 0),
                'seller_name': product['seller_name'],
                'explanation': item['explanation']
            })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations),
            'algorithm': 'popularity_based'
        }), 200
        
    except Exception as e:
        print(f"Error getting popular products: {e}")
        return jsonify({'error': 'Failed to get popular products'}), 500

@recommendations_bp.route('/trending', methods=['GET'])
def get_trending_products():
    """Get trending products based on recent views and interactions"""
    try:
        limit = int(request.args.get('limit', 10))
        days = int(request.args.get('days', 7))
        
        from datetime import datetime, timedelta
        since_date = datetime.utcnow() - timedelta(days=days)
        
        trending_pipeline = [
            {'$match': {
                'event_type': 'view',
                'timestamp': {'$gte': since_date}
            }},
            {'$group': {
                '_id': '$product_id',
                'view_count': {'$sum': 1},
                'unique_users': {'$addToSet': '$user_id'}
            }},
            {'$addFields': {
                'unique_user_count': {'$size': '$unique_users'}
            }},
            {'$sort': {'view_count': -1, 'unique_user_count': -1}},
            {'$limit': limit}
        ]
        
        trending_data = list(db.user_events.aggregate(trending_pipeline))
        
        recommendations = []
        for item in trending_data:
            product = db.products.find_one({'_id': item['_id'], 'is_active': True})
            if product:
                recommendations.append({
                    'id': str(product['_id']),
                    'name': product['name'],
                    'description': product['description'],
                    'category': product['category'],
                    'price': product['price'],
                    'image_url': product['image_url'],
                    'rating': product.get('rating', 0),
                    'seller_name': product['seller_name'],
                    'view_count': item['view_count'],
                    'unique_viewers': item['unique_user_count'],
                    'explanation': f"Trending with {item['view_count']} views from {item['unique_user_count']} users"
                })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations),
            'algorithm': 'trending_analytics'
        }), 200
        
    except Exception as e:
        print(f"Error getting trending products: {e}")
        return jsonify({'error': 'Failed to get trending products'}), 500

@recommendations_bp.route('/category/<category_name>', methods=['GET'])
def get_category_recommendations(category_name):
    """Get recommendations within a specific category"""
    try:
        limit = int(request.args.get('limit', 10))
        
        products = list(db.products.find({
            'category': category_name,
            'is_active': True
        }).sort([
            ('rating', -1),
            ('wishlist_count', -1)
        ]).limit(limit))
        
        recommendations = []
        for product in products:
            recommendations.append({
                'id': str(product['_id']),
                'name': product['name'],
                'description': product['description'],
                'category': product['category'],
                'price': product['price'],
                'image_url': product['image_url'],
                'rating': product.get('rating', 0),
                'seller_name': product['seller_name'],
                'explanation': f"Top rated in {category_name} category"
            })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations),
            'category': category_name,
            'algorithm': 'category_based'
        }), 200
        
    except Exception as e:
        print(f"Error getting category recommendations: {e}")
        return jsonify({'error': 'Failed to get category recommendations'}), 500

@recommendations_bp.route('/hybrid/personalized', methods=['GET'])
@auth_required
def get_hybrid_personalized_recommendations():
    """
    Get hybrid personalized recommendations (CF + Content + Popularity)
    """
    try:
        user_id = request.current_user_id
        limit = int(request.args.get('limit', 10))
        
        # Get hybrid recommendations
        recommendations_data = recommendation_service.get_hybrid_personalized_recommendations(
            user_id,
            top_n=limit
        )
        
        # Format response
        recommendations = []
        for item in recommendations_data:
            product = item['product']
            recommendations.append({
                'id': str(product['_id']),
                'name': product['name'],
                'description': product['description'],
                'category': product['category'],
                'price': product['price'],
                'image_url': product['image_url'],
                'rating': product.get('rating', 0),
                'seller_name': product['seller_name'],
                'hybrid_score': item['hybrid_score'],
                'cf_score': item.get('cf_score', 0),
                'content_score': item.get('content_score', 0),
                'popularity_score': item.get('popularity_score', 0),
                'explanation': item['explanation']
            })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations),
            'algorithm': 'hybrid',
            'weights': {
                'collaborative': recommendation_service.collaborative_weight,
                'content': recommendation_service.content_weight,
                'popularity': recommendation_service.popularity_weight
            }
        }), 200
        
    except Exception as e:
        print(f"Error in get_hybrid_personalized_recommendations: {e}")
        return jsonify({'error': 'Failed to get hybrid recommendations'}), 500

@recommendations_bp.route('/hybrid/similar/<product_id>', methods=['GET'])
def get_hybrid_similar_products(product_id):
    """
    Get hybrid similar products (CF + Content similarity)
    """
    try:
        limit = int(request.args.get('limit', 10))
        min_similarity = float(request.args.get('min_similarity', 0.2))
        
        # Get hybrid similar products
        similar_products = recommendation_service.get_hybrid_similar_products(
            product_id,
            top_n=limit,
            min_similarity=min_similarity
        )
        
        # Format response
        recommendations = []
        for item in similar_products:
            product = item['product']
            recommendations.append({
                'id': str(product['_id']),
                'name': product['name'],
                'description': product['description'],
                'category': product['category'],
                'price': product['price'],
                'image_url': product['image_url'],
                'rating': product.get('rating', 0),
                'seller_name': product['seller_name'],
                'similarity_score': item['similarity_score'],
                'content_score': item.get('content_score', 0),
                'cf_score': item.get('cf_score', 0),
                'explanation': item['explanation']
            })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations),
            'algorithm': 'hybrid_similarity'
        }), 200
        
    except Exception as e:
        print(f"Error in get_hybrid_similar_products: {e}")
        return jsonify({'error': 'Failed to get hybrid similar products'}), 500

@recommendations_bp.route('/cf-personalized', methods=['GET'])
@auth_required
def get_cf_personalized_recommendations():
    """
    Get purely collaborative filtering personalized recommendations
    """
    try:
        user_id = request.current_user_id
        limit = int(request.args.get('limit', 10))
        
        # Get CF recommendations
        recommendations_data = collaborative_filtering_service.get_user_recommendations(
            user_id,
            n_recommendations=limit
        )
        
        # Format response
        recommendations = []
        for item in recommendations_data:
            product = item['product']
            recommendations.append({
                'id': str(product['_id']),
                'name': product['name'],
                'description': product['description'],
                'category': product['category'],
                'price': product['price'],
                'image_url': product['image_url'],
                'rating': product.get('rating', 0),
                'seller_name': product['seller_name'],
                'cf_score': item['cf_score'],
                'explanation': item['explanation']
            })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations),
            'algorithm': 'collaborative_filtering'
        }), 200
        
    except Exception as e:
        print(f"Error in get_cf_personalized_recommendations: {e}")
        return jsonify({'error': 'Failed to get CF personalized recommendations'}), 500

@recommendations_bp.route('/cf-similar/<product_id>', methods=['GET'])
def get_cf_similar_products(product_id):
    """
    Get purely collaborative filtering similar products
    """
    try:
        limit = int(request.args.get('limit', 10))
        
        # Get CF similar products
        similar_products = collaborative_filtering_service.get_similar_items(product_id, limit)
        
        # Format response
        recommendations = []
        for item in similar_products:
            product = item['product']
            recommendations.append({
                'id': str(product['_id']),
                'name': product['name'],
                'description': product['description'],
                'category': product['category'],
                'price': product['price'],
                'image_url': product['image_url'],
                'rating': product.get('rating', 0),
                'seller_name': product['seller_name'],
                'cf_score': item['cf_score'],
                'explanation': item['explanation']
            })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations),
            'algorithm': 'collaborative_filtering'
        }), 200
        
    except Exception as e:
        print(f"Error in get_cf_similar_products: {e}")
        return jsonify({'error': 'Failed to get CF similar products'}), 500

@recommendations_bp.route('/train-cf-model', methods=['POST'])
@auth_required
def train_collaborative_filtering_model():
    """
    Train/retrain the collaborative filtering model
    Admin only endpoint
    """
    try:
        user = request.current_user
        
        if user['role'] != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403
        
        # Train the model
        print("Starting collaborative filtering model training...")
        model = collaborative_filtering_service.train_model()
        
        if model:
            return jsonify({
                'success': True,
                'message': 'Collaborative filtering model trained successfully',
                'training_time': collaborative_filtering_service.last_trained.isoformat() if collaborative_filtering_service.last_trained else None,
                'matrix_shape': collaborative_filtering_service.interaction_matrix.shape if collaborative_filtering_service.interaction_matrix is not None else None
            }), 200
        else:
            return jsonify({'error': 'Failed to train model'}), 500
            
    except Exception as e:
        print(f"Error training CF model: {e}")
        return jsonify({'error': 'Failed to train collaborative filtering model'}), 500

@recommendations_bp.route('/model-status', methods=['GET'])
@auth_required
def get_model_status():
    """
    Get status of recommendation models
    """
    try:
        cf_status = {
            'loaded': collaborative_filtering_service.model is not None,
            'last_trained': collaborative_filtering_service.last_trained.isoformat() if collaborative_filtering_service.last_trained else None,
            'needs_retraining': collaborative_filtering_service.needs_retraining(),
            'matrix_shape': collaborative_filtering_service.interaction_matrix.shape if collaborative_filtering_service.interaction_matrix is not None else None,
            'n_users': len(collaborative_filtering_service.user_index),
            'n_products': len(collaborative_filtering_service.product_index)
        }
        
        sbert_status = {
            'loaded': recommendation_service.model is not None,
            'embeddings_cached': len(recommendation_service.embeddings_cache),
            'cache_file_exists': os.path.exists(recommendation_service.cache_file)
        }
        
        return jsonify({
            'success': True,
            'collaborative_filtering': cf_status,
            'content_based': sbert_status,
            'hybrid_weights': {
                'collaborative': recommendation_service.collaborative_weight,
                'content': recommendation_service.content_weight,
                'popularity': recommendation_service.popularity_weight
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting model status: {e}")
        return jsonify({'error': 'Failed to get model status'}), 500

@recommendations_bp.route('/update-hybrid-weights', methods=['POST'])
@auth_required
def update_hybrid_weights():
    """
    Update hybrid recommendation weights
    Admin only endpoint
    """
    try:
        user = request.current_user
        
        if user['role'] != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403
        
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate weights
        cf_weight = float(data.get('collaborative', recommendation_service.collaborative_weight))
        content_weight = float(data.get('content', recommendation_service.content_weight))
        popularity_weight = float(data.get('popularity', recommendation_service.popularity_weight))
        
        # Ensure weights sum to 1.0
        total_weight = cf_weight + content_weight + popularity_weight
        if abs(total_weight - 1.0) > 0.01:
            return jsonify({'error': 'Weights must sum to 1.0'}), 400
        
        # Update weights
        recommendation_service.collaborative_weight = cf_weight
        recommendation_service.content_weight = content_weight
        recommendation_service.popularity_weight = popularity_weight
        
        # Clear cache to force recalculation with new weights
        recommendation_service.personalized_cache.clear()
        
        return jsonify({
            'success': True,
            'message': 'Hybrid weights updated successfully',
            'new_weights': {
                'collaborative': cf_weight,
                'content': content_weight,
                'popularity': popularity_weight
            }
        }), 200
        
    except Exception as e:
        print(f"Error updating hybrid weights: {e}")
        return jsonify({'error': 'Failed to update hybrid weights'}), 500

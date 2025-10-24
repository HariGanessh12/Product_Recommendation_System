from flask import Blueprint, request, jsonify
from middleware.auth import auth_required
from models import db
from datetime import datetime, timedelta
from bson import ObjectId

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/track-view', methods=['POST'])
@auth_required
def track_product_view():
    """Track when user views a product"""
    try:
        user_id = request.current_user_id
        data = request.get_json()
        product_id = data.get('product_id')
        
        if not product_id:
            return jsonify({'error': 'Product ID required'}), 400
        
        # Store view event
        view_event = {
            'user_id': ObjectId(user_id) if isinstance(user_id, str) else user_id,
            'product_id': ObjectId(product_id),
            'event_type': 'view',
            'timestamp': datetime.utcnow(),
            'session_id': data.get('session_id'),
            'source': data.get('source', 'product_page'),
            'user_agent': request.headers.get('User-Agent', '')
        }
        
        db.user_events.insert_one(view_event)
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        print(f"Error tracking view: {e}")
        return jsonify({'error': 'Failed to track view'}), 500

@analytics_bp.route('/track-recommendation-click', methods=['POST'])
@auth_required
def track_recommendation_click():
    """Track when user clicks on a recommendation"""
    try:
        user_id = request.current_user_id
        data = request.get_json()
        
        click_event = {
            'user_id': ObjectId(user_id) if isinstance(user_id, str) else user_id,
            'product_id': ObjectId(data.get('product_id')),
            'recommendation_type': data.get('recommendation_type'),
            'source_product_id': ObjectId(data.get('source_product_id')) if data.get('source_product_id') else None,
            'similarity_score': data.get('similarity_score'),
            'hybrid_score': data.get('hybrid_score'),
            'cf_score': data.get('cf_score'),
            'content_score': data.get('content_score'),
            'algorithm': data.get('algorithm', 'unknown'),
            'event_type': 'recommendation_click',
            'timestamp': datetime.utcnow()
        }
        
        db.user_events.insert_one(click_event)
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        print(f"Error tracking recommendation click: {e}")
        return jsonify({'error': 'Failed to track click'}), 500

@analytics_bp.route('/track-cart-action', methods=['POST'])
@auth_required
def track_cart_action():
    """Track cart add/remove actions"""
    try:
        user_id = request.current_user_id
        data = request.get_json()
        
        cart_event = {
            'user_id': ObjectId(user_id) if isinstance(user_id, str) else user_id,
            'product_id': ObjectId(data.get('product_id')),
            'action': data.get('action'),  # 'add', 'remove', 'update'
            'quantity': data.get('quantity', 1),
            'event_type': 'cart_action',
            'timestamp': datetime.utcnow(),
            'source': data.get('source', 'product_page')
        }
        
        db.user_events.insert_one(cart_event)
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        print(f"Error tracking cart action: {e}")
        return jsonify({'error': 'Failed to track cart action'}), 500

@analytics_bp.route('/track-wishlist-action', methods=['POST'])
@auth_required
def track_wishlist_action():
    """Track wishlist add/remove actions"""
    try:
        user_id = request.current_user_id
        data = request.get_json()
        
        wishlist_event = {
            'user_id': ObjectId(user_id) if isinstance(user_id, str) else user_id,
            'product_id': ObjectId(data.get('product_id')),
            'action': data.get('action'),  # 'add', 'remove'
            'event_type': 'wishlist_action',
            'timestamp': datetime.utcnow(),
            'source': data.get('source', 'product_page')
        }
        
        db.user_events.insert_one(wishlist_event)
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        print(f"Error tracking wishlist action: {e}")
        return jsonify({'error': 'Failed to track wishlist action'}), 500

@analytics_bp.route('/recommendation-stats', methods=['GET'])
@auth_required
def get_recommendation_stats():
    """Get recommendation performance statistics"""
    try:
        user = request.current_user
        
        if user['role'] != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403
        
        days = int(request.args.get('days', 7))
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # Get recommendation click stats by algorithm
        click_pipeline = [
            {'$match': {
                'event_type': 'recommendation_click',
                'timestamp': {'$gte': since_date}
            }},
            {'$group': {
                '_id': {
                    'algorithm': '$algorithm',
                    'recommendation_type': '$recommendation_type'
                },
                'clicks': {'$sum': 1},
                'avg_similarity_score': {'$avg': '$similarity_score'},
                'avg_hybrid_score': {'$avg': '$hybrid_score'},
                'avg_cf_score': {'$avg': '$cf_score'},
                'avg_content_score': {'$avg': '$content_score'}
            }},
            {'$sort': {'clicks': -1}}
        ]
        
        click_stats = list(db.user_events.aggregate(click_pipeline))
        
        # Get view stats by source
        view_pipeline = [
            {'$match': {
                'event_type': 'view',
                'timestamp': {'$gte': since_date}
            }},
            {'$group': {
                '_id': '$source',
                'views': {'$sum': 1},
                'unique_users': {'$addToSet': '$user_id'}
            }},
            {'$addFields': {
                'unique_user_count': {'$size': '$unique_users'}
            }}
        ]
        
        view_stats = list(db.user_events.aggregate(view_pipeline))
        
        # Calculate click-through rates
        total_views = sum(stat['views'] for stat in view_stats)
        total_clicks = sum(stat['clicks'] for stat in click_stats)
        ctr = (total_clicks / total_views * 100) if total_views > 0 else 0
        
        return jsonify({
            'success': True,
            'period_days': days,
            'recommendation_clicks': click_stats,
            'view_sources': view_stats,
            'summary': {
                'total_views': total_views,
                'total_recommendation_clicks': total_clicks,
                'click_through_rate': round(ctr, 2)
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting recommendation stats: {e}")
        return jsonify({'error': 'Failed to get stats'}), 500

@analytics_bp.route('/user-behavior', methods=['GET'])
@auth_required
def get_user_behavior_stats():
    """Get user behavior statistics"""
    try:
        user = request.current_user
        
        if user['role'] != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403
        
        days = int(request.args.get('days', 7))
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # User activity pipeline
        activity_pipeline = [
            {'$match': {'timestamp': {'$gte': since_date}}},
            {'$group': {
                '_id': {
                    'user_id': '$user_id',
                    'event_type': '$event_type'
                },
                'count': {'$sum': 1}
            }},
            {'$group': {
                '_id': '$_id.event_type',
                'total_events': {'$sum': '$count'},
                'unique_users': {'$sum': 1},
                'avg_events_per_user': {'$avg': '$count'}
            }}
        ]
        
        activity_stats = list(db.user_events.aggregate(activity_pipeline))
        
        # Most viewed products
        popular_pipeline = [
            {'$match': {
                'event_type': 'view',
                'timestamp': {'$gte': since_date}
            }},
            {'$group': {
                '_id': '$product_id',
                'views': {'$sum': 1},
                'unique_viewers': {'$addToSet': '$user_id'}
            }},
            {'$addFields': {
                'unique_viewer_count': {'$size': '$unique_viewers'}
            }},
            {'$sort': {'views': -1}},
            {'$limit': 10}
        ]
        
        popular_products_data = list(db.user_events.aggregate(popular_pipeline))
        
        # Get product details for popular products
        popular_products = []
        for item in popular_products_data:
            product = db.products.find_one({'_id': item['_id']})
            if product:
                popular_products.append({
                    'product_id': str(product['_id']),
                    'name': product['name'],
                    'category': product['category'],
                    'views': item['views'],
                    'unique_viewers': item['unique_viewer_count']
                })
        
        return jsonify({
            'success': True,
            'period_days': days,
            'user_activity': activity_stats,
            'most_viewed_products': popular_products
        }), 200
        
    except Exception as e:
        print(f"Error getting user behavior stats: {e}")
        return jsonify({'error': 'Failed to get user behavior stats'}), 500

@analytics_bp.route('/algorithm-performance', methods=['GET'])
@auth_required
def get_algorithm_performance():
    """Compare performance of different recommendation algorithms"""
    try:
        user = request.current_user
        
        if user['role'] != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403
        
        days = int(request.args.get('days', 7))
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # Algorithm performance pipeline
        performance_pipeline = [
            {'$match': {
                'event_type': 'recommendation_click',
                'timestamp': {'$gte': since_date}
            }},
            {'$group': {
                '_id': '$algorithm',
                'clicks': {'$sum': 1},
                'avg_similarity_score': {'$avg': '$similarity_score'},
                'avg_hybrid_score': {'$avg': '$hybrid_score'},
                'unique_users': {'$addToSet': '$user_id'},
                'unique_products': {'$addToSet': '$product_id'}
            }},
            {'$addFields': {
                'unique_user_count': {'$size': '$unique_users'},
                'unique_product_count': {'$size': '$unique_products'}
            }},
            {'$sort': {'clicks': -1}}
        ]
        
        algorithm_performance = list(db.user_events.aggregate(performance_pipeline))
        
        return jsonify({
            'success': True,
            'period_days': days,
            'algorithm_performance': algorithm_performance
        }), 200
        
    except Exception as e:
        print(f"Error getting algorithm performance: {e}")
        return jsonify({'error': 'Failed to get algorithm performance'}), 500

@analytics_bp.route('/my-activity', methods=['GET'])
@auth_required
def get_my_activity():
    """Get current user's activity statistics"""
    try:
        user_id = request.current_user_id
        days = int(request.args.get('days', 30))
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # User's activity summary
        activity_pipeline = [
            {'$match': {
                'user_id': ObjectId(user_id) if isinstance(user_id, str) else user_id,
                'timestamp': {'$gte': since_date}
            }},
            {'$group': {
                '_id': '$event_type',
                'count': {'$sum': 1}
            }}
        ]
        
        my_activity = list(db.user_events.aggregate(activity_pipeline))
        
        # Convert to dictionary for easier access
        activity_dict = {item['_id']: item['count'] for item in my_activity}
        
        return jsonify({
            'success': True,
            'period_days': days,
            'activity_summary': {
                'views': activity_dict.get('view', 0),
                'recommendation_clicks': activity_dict.get('recommendation_click', 0),
                'cart_actions': activity_dict.get('cart_action', 0),
                'wishlist_actions': activity_dict.get('wishlist_action', 0)
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting user activity: {e}")
        return jsonify({'error': 'Failed to get user activity'}), 500

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from models import db

wishlist_bp = Blueprint('wishlist', __name__)

@wishlist_bp.route('', methods=['GET'])
@jwt_required()
def get_wishlist():
    """Get user's wishlist items"""
    try:
        user_id = get_jwt_identity()
        user_id_str = str(user_id)
        
        # Get wishlist from recommendations collection
        user_prefs = db.recommendations.find_one({'user_id': user_id_str}) or {}
        wishlist_ids = [ObjectId(pid) for pid in user_prefs.get('wishlist', [])]
        
        if not wishlist_ids:
            print(f"200 OK - Wishlist retrieved: 0 items")
            return jsonify({
                'success': True,
                'wishlistItems': [],
                'count': 0
            }), 200
        
        # Get product details
        products = list(db.products.find({
            '_id': {'$in': wishlist_ids},
            'is_active': True
        }))
        
        formatted_items = []
        for product in products:
            formatted_items.append({
                'id': str(product['_id']),
                'name': product.get('name', 'Unknown Product'),
                'price': product.get('price', 0),
                'image': product.get('image_url', '/placeholder.jpg'),
                'category': product.get('category', 'Unknown'),
                'seller_name': product.get('seller_name', 'Unknown Seller'),
                'rating': product.get('rating', 0)
            })
        
        print(f"200 OK - Wishlist retrieved: {len(formatted_items)} items")
        
        return jsonify({
            'success': True,
            'wishlistItems': formatted_items,
            'count': len(formatted_items)
        }), 200
        
    except Exception as e:
        print(f"500 ERROR - Failed to fetch wishlist: {str(e)}")
        return jsonify({'error': 'Failed to fetch wishlist'}), 500

@wishlist_bp.route('/add', methods=['POST'])
@jwt_required()
def add_to_wishlist():
    """Add item to wishlist"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            print("400 BAD REQUEST - Add to wishlist attempted with no data")
            return jsonify({'error': 'No data provided'}), 400
            
        product_id = data.get('product_id')
        
        if not product_id:
            print("400 BAD REQUEST - Add to wishlist failed: Missing product ID")
            return jsonify({'error': 'Product ID is required'}), 400
        
        user_id_str = str(user_id)
        
        # Verify product exists
        try:
            product = db.products.find_one({'_id': ObjectId(product_id)})
            if not product:
                print(f"404 NOT FOUND - Add to wishlist failed: Product not found")
                return jsonify({'error': 'Product not found'}), 404
        except Exception:
            print(f"400 BAD REQUEST - Add to wishlist failed: Invalid product ID")
            return jsonify({'error': 'Invalid product ID'}), 400
        
        # Update or create user preferences
        result = db.recommendations.update_one(
            {'user_id': user_id_str},
            {
                '$addToSet': {'wishlist': product_id},
                '$set': {'updated_at': datetime.utcnow()}
            },
            upsert=True
        )
        
        
        print(f"200 OK - Item added to wishlist successfully")
        
        return jsonify({
            'success': True,
            'message': 'Item added to wishlist successfully'
        }), 200
        
    except Exception as e:
        print(f"500 ERROR - Add to wishlist failed: {str(e)}")
        return jsonify({'error': 'Failed to add to wishlist'}), 500

@wishlist_bp.route('/remove', methods=['DELETE'])
@jwt_required()
def remove_from_wishlist():
    """Remove item from wishlist"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            print("400 BAD REQUEST - Remove from wishlist attempted with no data")
            return jsonify({'error': 'No data provided'}), 400
        
        product_id = data.get('product_id')
        
        if not product_id:
            print("400 BAD REQUEST - Remove from wishlist failed: Missing product ID")
            return jsonify({'error': 'Product ID is required'}), 400
        
        user_id_str = str(user_id)
        
        # Remove from wishlist
        result = db.recommendations.update_one(
            {'user_id': user_id_str},
            {
                '$pull': {'wishlist': product_id},
                '$set': {'updated_at': datetime.utcnow()}
            }
        )
        
        if result.modified_count > 0:
            print(f"200 OK - Item removed from wishlist successfully")
            return jsonify({
                'success': True,
                'message': 'Item removed from wishlist successfully'
            }), 200
        else:
            print(f"404 NOT FOUND - Remove from wishlist failed: Item not found")
            return jsonify({'error': 'Item not found in wishlist'}), 404
        
    except Exception as e:
        print(f"500 ERROR - Remove from wishlist failed: {str(e)}")
        return jsonify({'error': 'Failed to remove from wishlist'}), 500

@wishlist_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_wishlist():
    """Clear all items from wishlist"""
    try:
        user_id = get_jwt_identity()
        user_id_str = str(user_id)
        
        result = db.recommendations.update_one(
            {'user_id': user_id_str},
            {
                '$set': {
                    'wishlist': [],
                    'updated_at': datetime.utcnow()
                }
            },
            upsert=True
        )
        
        
        print(f"200 OK - Wishlist cleared successfully")
        
        return jsonify({
            'success': True,
            'message': 'Wishlist cleared successfully'
        }), 200
        
    except Exception as e:
        print(f"500 ERROR - Wishlist clear failed: {str(e)}")
        return jsonify({'error': 'Failed to clear wishlist'}), 500

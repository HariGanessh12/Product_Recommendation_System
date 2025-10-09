from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from models import db

cart_bp = Blueprint('cart', __name__)

@cart_bp.route('', methods=['GET'])
@jwt_required()
def get_cart():
    """Get user's cart items"""
    try:
        user_id = get_jwt_identity()
        
        # Get cart items from MongoDB for this specific user
        pipeline = [
            {
                '$match': {'user_id': user_id}
            },
            {
                '$lookup': {
                    'from': 'products',
                    'localField': 'product_id',
                    'foreignField': '_id',
                    'as': 'product'
                }
            },
            {
                '$unwind': '$product'
            },
            {
                '$project': {
                    '_id': 1,
                    'user_id': 1,
                    'product_id': 1,
                    'quantity': 1,
                    'created_at': 1,
                    'updated_at': 1,
                    'product.name': 1,
                    'product.price': 1,
                    'product.image_url': 1,
                    'product.category': 1,
                    'product.seller_name': 1
                }
            }
        ]
        
        cart_items = list(db.cart.aggregate(pipeline))
        formatted_items = []
        
        for item in cart_items:
            product = item.get('product', {})
            formatted_items.append({
                'id': str(item['product_id']),
                'cart_id': str(item['_id']),
                'name': product.get('name', 'Unknown Product'),
                'price': product.get('price', 0),
                'image': product.get('image_url', '/placeholder.jpg'),
                'category': product.get('category', 'Unknown'),
                'seller_name': product.get('seller_name', 'Unknown Seller'),
                'quantity': item['quantity']
            })
        
        return jsonify({
            'success': True,
            'cartItems': formatted_items,
            'count': len(formatted_items)
        }), 200
        
    except Exception as e:
        print(f"Error getting cart: {str(e)}")
        return jsonify({'error': 'Failed to fetch cart'}), 500

@cart_bp.route('/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    """Add item to cart"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        
        if not product_id:
            return jsonify({'error': 'Product ID is required'}), 400
        
        # Check if item already exists in cart for this user
        existing_item = db.cart.find_one({
            'user_id': user_id,
            'product_id': ObjectId(product_id)
        })
        
        if existing_item:
            # Update quantity
            new_quantity = existing_item['quantity'] + quantity
            db.cart.update_one(
                {'_id': existing_item['_id']},
                {
                    '$set': {
                        'quantity': new_quantity,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
        else:
            # Add new item to MongoDB
            cart_item = {
                'user_id': user_id,
                'product_id': ObjectId(product_id),
                'quantity': quantity,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            db.cart.insert_one(cart_item)
        
        return jsonify({
            'success': True,
            'message': 'Item added to cart'
        }), 200
        
    except Exception as e:
        print(f"Error adding to cart: {str(e)}")
        return jsonify({'error': 'Failed to add to cart'}), 500

@cart_bp.route('/update', methods=['PUT'])
@jwt_required()
def update_cart_item():
    """Update cart item quantity"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        product_id = data.get('product_id')
        quantity = data.get('quantity')
        
        if quantity <= 0:
            # Remove item if quantity is 0 or negative
            db.cart.delete_one({
                'user_id': user_id,
                'product_id': ObjectId(product_id)
            })
        else:
            # Update quantity
            db.cart.update_one(
                {
                    'user_id': user_id,
                    'product_id': ObjectId(product_id)
                },
                {
                    '$set': {
                        'quantity': quantity,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
        
        return jsonify({
            'success': True,
            'message': 'Cart updated'
        }), 200
        
    except Exception as e:
        print(f"Error updating cart: {str(e)}")
        return jsonify({'error': 'Failed to update cart'}), 500

@cart_bp.route('/remove', methods=['DELETE'])
@jwt_required()
def remove_from_cart():
    """Remove item from cart"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        product_id = data.get('product_id')
        
        db.cart.delete_one({
            'user_id': user_id,
            'product_id': ObjectId(product_id)
        })
        
        return jsonify({
            'success': True,
            'message': 'Item removed from cart'
        }), 200
        
    except Exception as e:
        print(f"Error removing from cart: {str(e)}")
        return jsonify({'error': 'Failed to remove from cart'}), 500

@cart_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_cart():
    """Clear all items from cart"""
    try:
        user_id = get_jwt_identity()
        
        db.cart.delete_many({
            'user_id': user_id
        })
        
        return jsonify({
            'success': True,
            'message': 'Cart cleared'
        }), 200
        
    except Exception as e:
        print(f"Error clearing cart: {str(e)}")
        return jsonify({'error': 'Failed to clear cart'}), 500

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
        
        # DEBUG: Print user_id for troubleshooting
        print(f"DEBUG: Getting cart for user_id: {user_id}")
        print(f"DEBUG: User_id type: {type(user_id)}")
        
        # Convert user_id to string if it's not already
        user_id_str = str(user_id)
        
        # Get cart items from MongoDB for this specific user
        pipeline = [
            {
                '$match': {'user_id': user_id_str}
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
                    'product.seller_name': 1,
                    'product.stock': 1
                }
            }
        ]
        
        cart_items = list(db.cart.aggregate(pipeline))
        
        # DEBUG: Print cart query results
        print(f"DEBUG: Found {len(cart_items)} cart items for user {user_id_str}")
        
        formatted_items = []
        total_amount = 0
        
        for item in cart_items:
            product = item.get('product', {})
            item_total = product.get('price', 0) * item.get('quantity', 0)
            total_amount += item_total
            
            formatted_items.append({
                'id': str(item['product_id']),
                'cart_id': str(item['_id']),
                'name': product.get('name', 'Unknown Product'),
                'price': product.get('price', 0),
                'image': product.get('image_url', '/placeholder.jpg'),
                'category': product.get('category', 'Unknown'),
                'seller_name': product.get('seller_name', 'Unknown Seller'),
                'quantity': item['quantity'],
                'stock': product.get('stock', 0),
                'item_total': item_total
            })
        
        return jsonify({
            'success': True,
            'cartItems': formatted_items,
            'count': len(formatted_items),
            'total_amount': total_amount,
            'user_id': user_id_str  # Include for debugging
        }), 200
        
    except Exception as e:
        print(f"DEBUG: Error getting cart: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch cart'}), 500

@cart_bp.route('/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    """Add item to cart"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # DEBUG: Print user_id and data
        print(f"DEBUG: Adding to cart for user_id: {user_id}")
        print(f"DEBUG: User_id type: {type(user_id)}")
        print(f"DEBUG: Cart data: {data}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        product_id = data.get('product_id')
        quantity = int(data.get('quantity', 1))
        
        if not product_id:
            return jsonify({'error': 'Product ID is required'}), 400
        
        if quantity <= 0:
            return jsonify({'error': 'Quantity must be greater than 0'}), 400
        
        # Convert user_id to string for consistency
        user_id_str = str(user_id)
        
        # Verify product exists
        try:
            product = db.products.find_one({'_id': ObjectId(product_id)})
            if not product:
                return jsonify({'error': 'Product not found'}), 404
            
            # Check stock availability
            if product.get('stock', 0) < quantity:
                return jsonify({'error': 'Insufficient stock available'}), 400
                
        except Exception as e:
            print(f"DEBUG: Product verification error: {e}")
            return jsonify({'error': 'Invalid product ID'}), 400
        
        # Check if item already exists in cart for this user
        existing_item = db.cart.find_one({
            'user_id': user_id_str,
            'product_id': ObjectId(product_id)
        })
        
        print(f"DEBUG: Checking existing item - user_id: {user_id_str}, product_id: {product_id}")
        print(f"DEBUG: Found existing item: {existing_item is not None}")
        
        if existing_item:
            # Update quantity
            new_quantity = existing_item['quantity'] + quantity
            
            # Check if new quantity exceeds stock
            if product.get('stock', 0) < new_quantity:
                return jsonify({'error': 'Adding this quantity would exceed available stock'}), 400
            
            result = db.cart.update_one(
                {'_id': existing_item['_id']},
                {
                    '$set': {
                        'quantity': new_quantity,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
            print(f"DEBUG: Updated existing cart item quantity to: {new_quantity}")
            
            if result.modified_count == 0:
                return jsonify({'error': 'Failed to update cart item'}), 500
                
        else:
            # Add new item to MongoDB
            cart_item = {
                'user_id': user_id_str,  # Store as string for consistency
                'product_id': ObjectId(product_id),
                'quantity': quantity,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            result = db.cart.insert_one(cart_item)
            print(f"DEBUG: Added new cart item with ID: {result.inserted_id}")
            print(f"DEBUG: Cart item data: {cart_item}")
        
        return jsonify({
            'success': True,
            'message': 'Item added to cart successfully'
        }), 200
        
    except Exception as e:
        print(f"DEBUG: Error adding to cart: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to add to cart'}), 500

@cart_bp.route('/update', methods=['PUT'])
@jwt_required()
def update_cart_item():
    """Update cart item quantity"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        print(f"DEBUG: Updating cart for user_id: {user_id}")
        print(f"DEBUG: Update data: {data}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        product_id = data.get('product_id')
        quantity = int(data.get('quantity', 1))
        
        if not product_id:
            return jsonify({'error': 'Product ID is required'}), 400
        
        # Convert user_id to string for consistency
        user_id_str = str(user_id)
        
        if quantity <= 0:
            # Remove item if quantity is 0 or negative
            result = db.cart.delete_one({
                'user_id': user_id_str,
                'product_id': ObjectId(product_id)
            })
            
            if result.deleted_count > 0:
                return jsonify({
                    'success': True,
                    'message': 'Item removed from cart'
                }), 200
            else:
                return jsonify({'error': 'Item not found in cart'}), 404
        else:
            # Verify product stock
            try:
                product = db.products.find_one({'_id': ObjectId(product_id)})
                if not product:
                    return jsonify({'error': 'Product not found'}), 404
                
                if product.get('stock', 0) < quantity:
                    return jsonify({'error': 'Insufficient stock available'}), 400
                    
            except Exception as e:
                return jsonify({'error': 'Invalid product ID'}), 400
            
            # Update quantity
            result = db.cart.update_one(
                {
                    'user_id': user_id_str,
                    'product_id': ObjectId(product_id)
                },
                {
                    '$set': {
                        'quantity': quantity,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                return jsonify({
                    'success': True,
                    'message': 'Cart updated successfully'
                }), 200
            else:
                return jsonify({'error': 'Item not found in cart'}), 404
        
    except ValueError:
        return jsonify({'error': 'Invalid quantity value'}), 400
    except Exception as e:
        print(f"DEBUG: Error updating cart: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to update cart'}), 500

@cart_bp.route('/remove', methods=['DELETE'])
@jwt_required()
def remove_from_cart():
    """Remove item from cart"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        print(f"DEBUG: Removing from cart for user_id: {user_id}")
        print(f"DEBUG: Remove data: {data}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        product_id = data.get('product_id')
        
        if not product_id:
            return jsonify({'error': 'Product ID is required'}), 400
        
        # Convert user_id to string for consistency
        user_id_str = str(user_id)
        
        result = db.cart.delete_one({
            'user_id': user_id_str,
            'product_id': ObjectId(product_id)
        })
        
        print(f"DEBUG: Removal result - deleted_count: {result.deleted_count}")
        
        if result.deleted_count > 0:
            return jsonify({
                'success': True,
                'message': 'Item removed from cart successfully'
            }), 200
        else:
            return jsonify({'error': 'Item not found in cart'}), 404
        
    except Exception as e:
        print(f"DEBUG: Error removing from cart: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to remove from cart'}), 500

@cart_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_cart():
    """Clear all items from cart"""
    try:
        user_id = get_jwt_identity()
        
        print(f"DEBUG: Clearing cart for user_id: {user_id}")
        
        # Convert user_id to string for consistency
        user_id_str = str(user_id)
        
        result = db.cart.delete_many({
            'user_id': user_id_str
        })
        
        print(f"DEBUG: Clear result - deleted_count: {result.deleted_count}")
        
        return jsonify({
            'success': True,
            'message': f'Cart cleared successfully. Removed {result.deleted_count} items.'
        }), 200
        
    except Exception as e:
        print(f"DEBUG: Error clearing cart: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to clear cart'}), 500

@cart_bp.route('/count', methods=['GET'])
@jwt_required()
def get_cart_count():
    """Get total number of items in cart"""
    try:
        user_id = get_jwt_identity()
        user_id_str = str(user_id)
        
        # Get total quantity of all items
        pipeline = [
            {'$match': {'user_id': user_id_str}},
            {'$group': {'_id': None, 'total_quantity': {'$sum': '$quantity'}}}
        ]
        
        result = list(db.cart.aggregate(pipeline))
        total_quantity = result[0]['total_quantity'] if result else 0
        
        return jsonify({
            'success': True,
            'count': total_quantity
        }), 200
        
    except Exception as e:
        print(f"DEBUG: Error getting cart count: {str(e)}")
        return jsonify({'error': 'Failed to get cart count'}), 500

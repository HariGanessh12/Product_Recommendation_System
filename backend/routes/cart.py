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
        user_id_str = str(user_id)
        
        pipeline = [
            {'$match': {'user_id': user_id_str}},
            {
                '$lookup': {
                    'from': 'products',
                    'localField': 'product_id',
                    'foreignField': '_id',
                    'as': 'product'
                }
            },
            {'$unwind': '$product'},
            {
                '$project': {
                    '_id': 1, 'user_id': 1, 'product_id': 1, 'quantity': 1,
                    'created_at': 1, 'updated_at': 1,
                    'product.name': 1, 'product.price': 1, 'product.image_url': 1,
                    'product.category': 1, 'product.seller_name': 1, 'product.stock': 1
                }
            }
        ]
        
        cart_items = list(db.cart.aggregate(pipeline))
        
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
        
        print(f"200 OK - Cart retrieved successfully: {len(formatted_items)} items")
        
        return jsonify({
            'success': True,
            'cartItems': formatted_items,
            'count': len(formatted_items),
            'total_amount': total_amount,
            'user_id': user_id_str
        }), 200
        
    except Exception as e:
        print(f"500 ERROR - Failed to fetch cart: {str(e)}")
        return jsonify({'error': 'Failed to fetch cart'}), 500

@cart_bp.route('/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    """Add item to cart"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            print("400 BAD REQUEST - Add to cart attempted with no data")
            return jsonify({'error': 'No data provided'}), 400
            
        product_id = data.get('product_id')
        quantity = int(data.get('quantity', 1))
        
        if not product_id:
            print("400 BAD REQUEST - Add to cart failed: Missing product ID")
            return jsonify({'error': 'Product ID is required'}), 400
        
        if quantity <= 0:
            print("400 BAD REQUEST - Add to cart failed: Invalid quantity")
            return jsonify({'error': 'Quantity must be greater than 0'}), 400
        
        user_id_str = str(user_id)
        
        try:
            product = db.products.find_one({'_id': ObjectId(product_id)})
            if not product:
                print(f"404 NOT FOUND - Add to cart failed: Product not found")
                return jsonify({'error': 'Product not found'}), 404
            
            if product.get('stock', 0) < quantity:
                print(f"400 BAD REQUEST - Add to cart failed: Insufficient stock")
                return jsonify({'error': 'Insufficient stock available'}), 400
                
        except Exception as e:
            print(f"400 BAD REQUEST - Add to cart failed: Invalid product ID")
            return jsonify({'error': 'Invalid product ID'}), 400
        
        existing_item = db.cart.find_one({
            'user_id': user_id_str,
            'product_id': ObjectId(product_id)
        })
        
        if existing_item:
            new_quantity = existing_item['quantity'] + quantity
            
            if product.get('stock', 0) < new_quantity:
                print(f"400 BAD REQUEST - Add to cart failed: Would exceed stock")
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
            
            if result.modified_count == 0:
                print(f"500 ERROR - Add to cart failed: Database update failed")
                return jsonify({'error': 'Failed to update cart item'}), 500
                
        else:
            cart_item = {
                'user_id': user_id_str,
                'product_id': ObjectId(product_id),
                'quantity': quantity,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            result = db.cart.insert_one(cart_item)
        
        
        print(f"200 OK - Item added to cart successfully")
        
        return jsonify({
            'success': True,
            'message': 'Item added to cart successfully'
        }), 200
        
    except Exception as e:
        print(f"500 ERROR - Add to cart failed: {str(e)}")
        return jsonify({'error': 'Failed to add to cart'}), 500

@cart_bp.route('/update', methods=['PUT'])
@jwt_required()
def update_cart_item():
    """Update cart item quantity"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            print("400 BAD REQUEST - Cart update attempted with no data")
            return jsonify({'error': 'No data provided'}), 400
        
        product_id = data.get('product_id')
        quantity = int(data.get('quantity', 1))
        
        if not product_id:
            print("400 BAD REQUEST - Cart update failed: Missing product ID")
            return jsonify({'error': 'Product ID is required'}), 400
        
        user_id_str = str(user_id)
        
        if quantity <= 0:
            result = db.cart.delete_one({
                'user_id': user_id_str,
                'product_id': ObjectId(product_id)
            })
            
            if result.deleted_count > 0:
                print(f"200 OK - Item removed from cart successfully")
                return jsonify({
                    'success': True,
                    'message': 'Item removed from cart'
                }), 200
            else:
                print(f"404 NOT FOUND - Cart update failed: Item not found")
                return jsonify({'error': 'Item not found in cart'}), 404
        else:
            try:
                product = db.products.find_one({'_id': ObjectId(product_id)})
                if not product:
                    print(f"404 NOT FOUND - Cart update failed: Product not found")
                    return jsonify({'error': 'Product not found'}), 404
                
                if product.get('stock', 0) < quantity:
                    print(f"400 BAD REQUEST - Cart update failed: Insufficient stock")
                    return jsonify({'error': 'Insufficient stock available'}), 400
                    
            except Exception as e:
                print(f"400 BAD REQUEST - Cart update failed: Invalid product ID")
                return jsonify({'error': 'Invalid product ID'}), 400
            
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
                print(f"200 OK - Cart updated successfully")
                return jsonify({
                    'success': True,
                    'message': 'Cart updated successfully'
                }), 200
            else:
                print(f"404 NOT FOUND - Cart update failed: Item not found")
                return jsonify({'error': 'Item not found in cart'}), 404
        
    except ValueError:
        print("400 BAD REQUEST - Cart update failed: Invalid quantity value")
        return jsonify({'error': 'Invalid quantity value'}), 400
    except Exception as e:
        print(f"500 ERROR - Cart update failed: {str(e)}")
        return jsonify({'error': 'Failed to update cart'}), 500

@cart_bp.route('/remove', methods=['DELETE'])
@jwt_required()
def remove_from_cart():
    """Remove item from cart"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            print("400 BAD REQUEST - Cart removal attempted with no data")
            return jsonify({'error': 'No data provided'}), 400
        
        product_id = data.get('product_id')
        
        if not product_id:
            print("400 BAD REQUEST - Cart removal failed: Missing product ID")
            return jsonify({'error': 'Product ID is required'}), 400
        
        user_id_str = str(user_id)
        
        result = db.cart.delete_one({
            'user_id': user_id_str,
            'product_id': ObjectId(product_id)
        })
        
        if result.deleted_count > 0:
            print(f"200 OK - Item removed from cart successfully")
            return jsonify({
                'success': True,
                'message': 'Item removed from cart successfully'
            }), 200
        else:
            print(f"404 NOT FOUND - Cart removal failed: Item not found")
            return jsonify({'error': 'Item not found in cart'}), 404
        
    except Exception as e:
        print(f"500 ERROR - Cart removal failed: {str(e)}")
        return jsonify({'error': 'Failed to remove from cart'}), 500

@cart_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_cart():
    """Clear all items from cart"""
    try:
        user_id = get_jwt_identity()
        user_id_str = str(user_id)
        
        result = db.cart.delete_many({
            'user_id': user_id_str
        })
                
        print(f"200 OK - Cart cleared successfully: {result.deleted_count} items removed")
        
        return jsonify({
            'success': True,
            'message': f'Cart cleared successfully. Removed {result.deleted_count} items.'
        }), 200
        
    except Exception as e:
        print(f"500 ERROR - Cart clear failed: {str(e)}")
        return jsonify({'error': 'Failed to clear cart'}), 500

@cart_bp.route('/count', methods=['GET'])
@jwt_required()
def get_cart_count():
    """Get total number of items in cart"""
    try:
        user_id = get_jwt_identity()
        user_id_str = str(user_id)
        
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
        print(f"500 ERROR - Cart count failed: {str(e)}")
        return jsonify({'error': 'Failed to get cart count'}), 500

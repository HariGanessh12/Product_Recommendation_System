from bson import ObjectId
from models import db
from datetime import datetime

class Cart:
    @staticmethod
    def add_to_cart(user_id, product_id, quantity=1):
        """Add item to user's cart"""
        try:
            # Check if item already exists in cart
            existing_item = db.cart.find_one({
                'user_id': ObjectId(user_id),
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
                return Cart._format_cart_item({**existing_item, 'quantity': new_quantity})
            else:
                # Add new item
                cart_item = {
                    'user_id': ObjectId(user_id),
                    'product_id': ObjectId(product_id),
                    'quantity': quantity,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
                result = db.cart.insert_one(cart_item)
                cart_item['_id'] = result.inserted_id
                return Cart._format_cart_item(cart_item)
                
        except Exception as e:
            print(f"Error in add_to_cart: {str(e)}")
            raise Exception(f"Failed to add to cart: {str(e)}")

    @staticmethod
    def get_user_cart(user_id):
        """Get all cart items for a user with product details"""
        try:
            pipeline = [
                {
                    '$match': {'user_id': ObjectId(user_id)}
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
            return [Cart._format_cart_item_with_product(item) for item in cart_items]
            
        except Exception as e:
            print(f"Error in get_user_cart: {str(e)}")
            return []

    @staticmethod
    def update_quantity(user_id, product_id, quantity):
        """Update cart item quantity"""
        try:
            result = db.cart.update_one(
                {
                    'user_id': ObjectId(user_id),
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
                updated_item = db.cart.find_one({
                    'user_id': ObjectId(user_id),
                    'product_id': ObjectId(product_id)
                })
                return Cart._format_cart_item(updated_item)
            return None
            
        except Exception as e:
            print(f"Error in update_quantity: {str(e)}")
            raise Exception(f"Failed to update cart: {str(e)}")

    @staticmethod
    def remove_from_cart(user_id, product_id):
        """Remove item from cart"""
        try:
            result = db.cart.delete_one({
                'user_id': ObjectId(user_id),
                'product_id': ObjectId(product_id)
            })
            return result.deleted_count > 0
            
        except Exception as e:
            print(f"Error in remove_from_cart: {str(e)}")
            raise Exception(f"Failed to remove from cart: {str(e)}")

    @staticmethod
    def clear_cart(user_id):
        """Clear all items from user's cart"""
        try:
            result = db.cart.delete_many({
                'user_id': ObjectId(user_id)
            })
            return result.deleted_count
            
        except Exception as e:
            print(f"Error in clear_cart: {str(e)}")
            raise Exception(f"Failed to clear cart: {str(e)}")

    @staticmethod
    def _format_cart_item(cart_item):
        """Format cart item for response"""
        return {
            'id': str(cart_item['_id']),
            'user_id': str(cart_item['user_id']),
            'product_id': str(cart_item['product_id']),
            'quantity': cart_item['quantity'],
            'created_at': cart_item['created_at'].isoformat() if cart_item.get('created_at') else None,
            'updated_at': cart_item['updated_at'].isoformat() if cart_item.get('updated_at') else None
        }

    @staticmethod
    def _format_cart_item_with_product(cart_item):
        """Format cart item with product details"""
        product = cart_item.get('product', {})
        return {
            'id': str(cart_item['product_id']),
            'cart_id': str(cart_item['_id']),
            'name': product.get('name'),
            'price': product.get('price', 0),
            'image': product.get('image_url'),
            'category': product.get('category'),
            'seller_name': product.get('seller_name'),
            'quantity': cart_item['quantity']
        }

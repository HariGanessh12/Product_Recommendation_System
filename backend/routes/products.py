from flask import Blueprint, request, jsonify
from models.product import Product
from models.user import User
from middleware.auth import auth_required, seller_required
import math
from bson import ObjectId

products_bp = Blueprint('products', __name__)

@products_bp.route('', methods=['GET'])
def get_products():
    try:
        # Get query parameters
        search = request.args.get('search', '')
        category = request.args.get('category', 'all')
        min_price = request.args.get('minPrice', 0)
        max_price = request.args.get('maxPrice', 10000)
        sort_by = request.args.get('sortBy', 'name')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        
        filters = {
            'search': search,
            'category': category,
            'minPrice': min_price,
            'maxPrice': max_price
        }
        
        products, total = Product.find_all(filters, sort_by, page, limit)
        
        return jsonify({
            'success': True,
            'products': products,
            'pagination': {
                'current': page,
                'pages': math.ceil(total / limit),
                'total': total
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching products: {e}")
        return jsonify({'error': 'Failed to fetch products'}), 500

@products_bp.route('/<product_id>', methods=['GET'])
def get_product(product_id):
    try:
        product = Product.find_by_id(product_id)
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        return jsonify({
            'success': True,
            'product': product
        }), 200
        
    except Exception as e:
        print(f"Error fetching product: {e}")
        return jsonify({'error': 'Failed to fetch product'}), 500

@products_bp.route('', methods=['POST'])
@auth_required
def create_product():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validation
        required_fields = ['name', 'description', 'category', 'price']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Additional validation
        try:
            price = float(data['price'])
            if price < 0:
                return jsonify({'error': 'Price must be a positive number'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Price must be a valid number'}), 400
        
        try:
            stock = int(data.get('stock', 0))
            if stock < 0:
                return jsonify({'error': 'Stock must be a non-negative number'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Stock must be a valid number'}), 400
        
        # Get current user
        user = request.current_user
        
        # Create product
        product = Product(
            name=data['name'].strip(),
            description=data['description'].strip(),
            category=data['category'].strip(),
            price=price,
            seller_id=str(user['_id']),
            seller_name=user['username'],
            image_url=data.get('image_url'),
            images=data.get('images', []),
            stock=stock,
            tags=data.get('tags', []),
            specifications=data.get('specifications', {})
        )
        
        product_id = product.save()
        created_product = Product.find_by_id(product_id)
        
        return jsonify({
            'success': True,
            'product': created_product,
            'message': 'Product created successfully'
        }), 201
        
    except Exception as e:
        print(f"Error creating product: {e}")
        return jsonify({'error': 'Failed to create product'}), 500

@products_bp.route('/<product_id>', methods=['PUT'])
@auth_required
def update_product(product_id):
    try:
        product = Product.find_by_id(product_id)
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Check ownership or admin
        user = request.current_user
        if str(product['seller_id']) != str(user['_id']) and user['role'] != 'admin':
            return jsonify({'error': 'Not authorized to update this product'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Remove fields that shouldn't be updated directly
        data.pop('_id', None)
        data.pop('seller_id', None)
        data.pop('seller_name', None)
        data.pop('created_at', None)
        data.pop('rating', None)
        data.pop('reviews_count', None)
        data.pop('wishlist_count', None)
        
        # Validate price and stock if provided
        if 'price' in data:
            try:
                data['price'] = float(data['price'])
                if data['price'] < 0:
                    return jsonify({'error': 'Price must be a positive number'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Price must be a valid number'}), 400
        
        if 'stock' in data:
            try:
                data['stock'] = int(data['stock'])
                if data['stock'] < 0:
                    return jsonify({'error': 'Stock must be a non-negative number'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Stock must be a valid number'}), 400
        
        # Trim string fields
        for field in ['name', 'description', 'category']:
            if field in data and isinstance(data[field], str):
                data[field] = data[field].strip()
        
        updated_product = Product.update_by_id(product_id, data)
        
        if not updated_product:
            return jsonify({'error': 'Failed to update product'}), 500
        
        return jsonify({
            'success': True,
            'product': updated_product,
            'message': 'Product updated successfully'
        }), 200
        
    except Exception as e:
        print(f"Error updating product: {e}")
        return jsonify({'error': 'Failed to update product'}), 500

@products_bp.route('/<product_id>', methods=['DELETE'])
@auth_required
def delete_product(product_id):
    try:
        product = Product.find_by_id(product_id)
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Check ownership or admin
        user = request.current_user
        if str(product['seller_id']) != str(user['_id']) and user['role'] != 'admin':
            return jsonify({'error': 'Not authorized to delete this product'}), 403
        
        success = Product.delete_by_id(product_id)
        
        if not success:
            return jsonify({'error': 'Failed to delete product'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Product deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Error deleting product: {e}")
        return jsonify({'error': 'Failed to delete product'}), 500

@products_bp.route('/seller/<seller_id>', methods=['GET'])
def get_seller_products(seller_id):
    try:
        products = Product.find_by_seller(seller_id)
        
        return jsonify({
            'success': True,
            'products': products,
            'count': len(products)
        }), 200
        
    except Exception as e:
        print(f"Error fetching seller products: {e}")
        return jsonify({'error': 'Failed to fetch seller products'}), 500

@products_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all unique product categories"""
    try:
        from models import db
        
        pipeline = [
            {'$match': {'is_active': True}},
            {'$group': {'_id': '$category'}},
            {'$sort': {'_id': 1}}
        ]
        
        categories = list(db.products.aggregate(pipeline))
        category_list = [cat['_id'] for cat in categories if cat['_id']]
        
        return jsonify({
            'success': True,
            'categories': category_list
        }), 200
        
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return jsonify({'error': 'Failed to fetch categories'}), 500

@products_bp.route('/featured', methods=['GET'])
def get_featured_products():
    """Get featured products (high rating or popular)"""
    try:
        from models import db
        
        limit = int(request.args.get('limit', 12))
        
        # Get products with high ratings or popularity
        products = list(db.products.find({
            'is_active': True,
            '$or': [
                {'rating': {'$gte': 4.0}},
                {'wishlist_count': {'$gte': 5}}
            ]
        }).sort([('rating', -1), ('wishlist_count', -1)]).limit(limit))
        
        # Convert ObjectId to string
        for product in products:
            product['_id'] = str(product['_id'])
            product['seller_id'] = str(product['seller_id'])
        
        return jsonify({
            'success': True,
            'products': products,
            'count': len(products)
        }), 200
        
    except Exception as e:
        print(f"Error fetching featured products: {e}")
        return jsonify({'error': 'Failed to fetch featured products'}), 500

@products_bp.route('/popular', methods=['GET'])
def get_popular_products():
    """Get most popular products based on wishlist count"""
    try:
        from models import db
        
        limit = int(request.args.get('limit', 10))
        
        products = list(db.products.find({
            'is_active': True
        }).sort([('wishlist_count', -1), ('rating', -1)]).limit(limit))
        
        # Convert ObjectId to string
        for product in products:
            product['_id'] = str(product['_id'])
            product['seller_id'] = str(product['seller_id'])
        
        return jsonify({
            'success': True,
            'products': products,
            'count': len(products)
        }), 200
        
    except Exception as e:
        print(f"Error fetching popular products: {e}")
        return jsonify({'error': 'Failed to fetch popular products'}), 500

@products_bp.route('/recent', methods=['GET'])
def get_recent_products():
    """Get recently added products"""
    try:
        from models import db
        
        limit = int(request.args.get('limit', 10))
        
        products = list(db.products.find({
            'is_active': True
        }).sort([('created_at', -1)]).limit(limit))
        
        # Convert ObjectId to string
        for product in products:
            product['_id'] = str(product['_id'])
            product['seller_id'] = str(product['seller_id'])
        
        return jsonify({
            'success': True,
            'products': products,
            'count': len(products)
        }), 200
        
    except Exception as e:
        print(f"Error fetching recent products: {e}")
        return jsonify({'error': 'Failed to fetch recent products'}), 500

@products_bp.route('/search/suggestions', methods=['GET'])
def get_search_suggestions():
    """Get search suggestions based on product names and categories"""
    try:
        from models import db
        
        query = request.args.get('q', '').strip()
        if not query or len(query) < 2:
            return jsonify({
                'success': True,
                'suggestions': []
            }), 200
        
        # Get product name suggestions
        name_suggestions = list(db.products.find({
            'is_active': True,
            'name': {'$regex': query, '$options': 'i'}
        }, {'name': 1}).limit(5))
        
        # Get category suggestions
        category_suggestions = list(db.products.find({
            'is_active': True,
            'category': {'$regex': query, '$options': 'i'}
        }, {'category': 1}).limit(3))
        
        suggestions = []
        
        # Add product names
        for product in name_suggestions:
            suggestions.append({
                'type': 'product',
                'text': product['name']
            })
        
        # Add unique categories
        seen_categories = set()
        for product in category_suggestions:
            if product['category'] not in seen_categories:
                suggestions.append({
                    'type': 'category',
                    'text': product['category']
                })
                seen_categories.add(product['category'])
        
        return jsonify({
            'success': True,
            'suggestions': suggestions[:8]  # Limit to 8 suggestions
        }), 200
        
    except Exception as e:
        print(f"Error fetching search suggestions: {e}")
        return jsonify({'error': 'Failed to fetch search suggestions'}), 500

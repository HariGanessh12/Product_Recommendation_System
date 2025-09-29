from flask import Blueprint, request, jsonify
from models.product import Product
from models.user import User
from middleware.auth import auth_required, seller_required
import math

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
        
        # Get current user
        user = request.current_user
        
        # Create product
        product = Product(
            name=data['name'],
            description=data['description'],
            category=data['category'],
            price=data['price'],
            seller_id=str(user['_id']),
            seller_name=user['username'],
            image_url=data.get('image_url'),
            images=data.get('images'),
            stock=data.get('stock', 0),
            tags=data.get('tags'),
            specifications=data.get('specifications')
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
            'products': products
        }), 200
        
    except Exception as e:
        print(f"Error fetching seller products: {e}")
        return jsonify({'error': 'Failed to fetch seller products'}), 500

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models.user import User
from models import db
from datetime import datetime
import re


auth_bp = Blueprint('auth', __name__)


def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


@auth_bp.route('/test-no-jwt', methods=['GET'])
def test_no_jwt():
    return jsonify({'message': 'Test route works without JWT'}), 200


@auth_bp.route('/test-with-jwt', methods=['GET'])
@jwt_required()
def test_with_jwt():
    return jsonify({'message': 'Test route works with JWT'}), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        role = data.get('role', 'buyer')
        
        # Validation
        if not username or len(username) < 2:
            return jsonify({'error': 'Username must be at least 2 characters'}), 400
        
        if not email or not validate_email(email):
            return jsonify({'error': 'Valid email is required'}), 400
        
        if not password or len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        if role not in ['buyer', 'seller', 'admin']:
            return jsonify({'error': 'Invalid role'}), 400
        
        # Check if user exists
        if User.user_exists(email):
            return jsonify({'error': 'User already exists with this email'}), 400
        
        # Create user
        user = User(username, email, password, role)
        user_id = user.save()
        
        # Create token
        access_token = create_access_token(identity=user_id)
        
        return jsonify({
            'success': True,
            'token': access_token,
            'user': {
                'id': user_id,
                'username': username,
                'email': email,
                'role': role
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user
        user = User.find_by_email(email)
        
        if not user or not User.verify_password(user, password):
            return jsonify({'error': 'Invalid credentials'}), 400
        
        # Create token
        access_token = create_access_token(identity=str(user['_id']))
        
        return jsonify({
            'success': True,
            'token': access_token,
            'user': {
                'id': str(user['_id']),
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    try:
        current_user_id = get_jwt_identity()
        user = User.find_by_id(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'success': True,
            'user': {
                'id': str(user['_id']),
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.find_by_id(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
            
        if current_user.get('role') != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        users = User.get_all_users()
        
        return jsonify({
            'success': True,
            'users': users,
            'count': len(users)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 422


@auth_bp.route('/users/<user_id>', methods=['GET'])
@jwt_required()
def get_user_by_id(user_id):
    """
    Get specific user by ID
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.find_by_id(current_user_id)
        
        # Users can view their own profile, admins can view any profile
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        if current_user.get('role') != 'admin' and current_user_id != user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Format response (exclude password hash)
        user_data = {
            'id': str(user['_id']),
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'created_at': user.get('created_at', '').isoformat() if hasattr(user.get('created_at', ''), 'isoformat') else str(user.get('created_at', '')),
            'updated_at': user.get('updated_at', '').isoformat() if hasattr(user.get('updated_at', ''), 'isoformat') else str(user.get('updated_at', ''))
        }
        
        return jsonify({
            'success': True,
            'user': user_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch user'}), 500


@auth_bp.route('/users/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.find_by_id(current_user_id)
        
        if not current_user or current_user.get('role') != 'admin':
            return jsonify({'error': 'Access denied. Admin privileges required.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Prepare update data
        update_data = {}
        
        # Status update (admin only)
        if 'status' in data:
            status = data['status']
            if status in ['active', 'banned']:
                update_data['status'] = status
        
        # Username update
        if 'username' in data:
            username = data['username'].strip()
            if len(username) >= 2:
                update_data['username'] = username
        
        # Role update (admin only)
        if 'role' in data:
            role = data['role']
            if role in ['buyer', 'seller', 'admin']:
                update_data['role'] = role
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        # Add updated timestamp
        update_data['updated_at'] = datetime.utcnow()
        
        # Perform update
        result = db.users.update_one(
            {'_id': user['_id']}, 
            {'$set': update_data}
        )
        
        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'User updated successfully'
            }), 200
        else:
            return jsonify({'error': 'No changes made'}), 400
        
    except Exception as e:
        return jsonify({'error': 'Failed to update user'}), 500


@auth_bp.route('/users/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """
    Delete user - Admin only
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.find_by_id(current_user_id)
        
        if not current_user or current_user.get('role') != 'admin':
            return jsonify({'error': 'Access denied. Admin privileges required.'}), 403
        
        # Prevent admin from deleting themselves
        if current_user_id == user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Perform deletion
        result = db.users.delete_one({'_id': user['_id']})
        
        if result.deleted_count > 0:
            return jsonify({
                'success': True,
                'message': 'User deleted successfully'
            }), 200
        else:
            return jsonify({'error': 'Failed to delete user'}), 500
        
    except Exception as e:
        return jsonify({'error': 'Failed to delete user'}), 500

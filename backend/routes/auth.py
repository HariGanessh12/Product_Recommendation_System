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
    print("200 OK - Test endpoint accessed without JWT")
    return jsonify({'message': 'Test route works without JWT'}), 200

@auth_bp.route('/test-with-jwt', methods=['GET'])
@jwt_required()
def test_with_jwt():
    print("200 OK - Test endpoint accessed with valid JWT")
    return jsonify({'message': 'Test route works with JWT'}), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            print("400 BAD REQUEST - Registration attempted with no data")
            return jsonify({'error': 'No data provided'}), 400
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        role = data.get('role', 'buyer')
        
        # Validation
        if not username or len(username) < 2:
            print(f"400 BAD REQUEST - Registration failed: Invalid username")
            return jsonify({'error': 'Username must be at least 2 characters'}), 400
        
        if not email or not validate_email(email):
            print(f"400 BAD REQUEST - Registration failed: Invalid email")
            return jsonify({'error': 'Valid email is required'}), 400
        
        if not password or len(password) < 6:
            print(f"400 BAD REQUEST - Registration failed: Invalid password")
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        if role not in ['buyer', 'seller', 'admin']:
            print(f"400 BAD REQUEST - Registration failed: Invalid role")
            return jsonify({'error': 'Invalid role'}), 400
        
        # Check if user exists
        if User.user_exists(email):
            print(f"409 CONFLICT - Registration failed: User already exists with email {email}")
            return jsonify({'error': 'User already exists with this email'}), 400
        
        # Create user
        user = User(username, email, password, role)
        user_id = user.save()
        
        # Create token
        access_token = create_access_token(identity=user_id)
        
        print(f"201 CREATED - User registered successfully: {username} ({role})")
        
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
        print(f"500 ERROR - Registration failed: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            print("400 BAD REQUEST - Login attempted with no data")
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not email or not password:
            print("400 BAD REQUEST - Login failed: Missing email or password")
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user
        user = User.find_by_email(email)
        
        if not user or not User.verify_password(user, password):
            print(f"401 UNAUTHORIZED - Login failed: Invalid credentials for {email}")
            return jsonify({'error': 'Invalid credentials'}), 400
        
        # Create token
        access_token = create_access_token(identity=str(user['_id']))
        
        print(f"200 OK - User login successful: {user['username']} ({user['role']})")
        
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
        print(f"500 ERROR - Login failed: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    try:
        current_user_id = get_jwt_identity()
        user = User.find_by_id(current_user_id)
        
        if not user:
            print(f"404 NOT FOUND - Token verification failed: User not found")
            return jsonify({'error': 'User not found'}), 404
        
        print(f"200 OK - Token verified successfully for user: {user['username']}")
        
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
        print(f"500 ERROR - Token verification failed: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.find_by_id(current_user_id)
        
        if not current_user:
            print("404 NOT FOUND - Users list access failed: User not found")
            return jsonify({'error': 'User not found'}), 404
            
        if current_user.get('role') != 'admin':
            print(f"403 FORBIDDEN - Users list access denied for user: {current_user.get('username')}")
            return jsonify({'error': 'Access denied'}), 403
        
        users = User.get_all_users()
        
        print(f"200 OK - Users list retrieved successfully: {len(users)} users")
        
        return jsonify({
            'success': True,
            'users': users,
            'count': len(users)
        }), 200
        
    except Exception as e:
        print(f"500 ERROR - Failed to get users list: {str(e)}")
        return jsonify({'error': str(e)}), 422

# Continue with other endpoints following the same pattern...

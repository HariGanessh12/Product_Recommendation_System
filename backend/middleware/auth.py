from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User

def auth_required(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.find_by_id(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Add user to request context
        request.current_user = user
        request.current_user_id = current_user_id
        
        return f(*args, **kwargs)
    
    return decorated_function

def seller_required(f):
    @wraps(f)
    @auth_required
    def decorated_function(*args, **kwargs):
        user = request.current_user
        
        if user['role'] not in ['seller', 'admin']:
            return jsonify({'error': 'Seller privileges required'}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function

def admin_required(f):
    @wraps(f)
    @auth_required
    def decorated_function(*args, **kwargs):
        user = request.current_user
        
        if user['role'] != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function

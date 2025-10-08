from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config
import logging
import os


# Import routes
from routes.auth import auth_bp
from routes.products import products_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Completely suppress werkzeug HTTP request logs
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    
    # Initialize extensions
    jwt = JWTManager(app)
    
    # Enhanced CORS configuration
    CORS(app, 
         origins=Config.CORS_ORIGINS,
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    
    @app.route('/')
    def home():
        return jsonify({
            'message': 'Product Recommendation System API',
            'version': '1.0.0',
            'status': 'running',
            'endpoints': {
                'auth': '/api/auth',
                'products': '/api/products'
            }
        })
    
    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy'}), 200
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Endpoint not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app


if __name__ == '__main__':
    app = create_app()
    
    # Additional suppression for development server
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        logging.getLogger('werkzeug').disabled = True
    
    app.run(debug=Config.DEBUG, host=Config.HOST, port=Config.PORT)

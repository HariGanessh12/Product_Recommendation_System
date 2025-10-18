from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config
import logging
import os
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from datetime import datetime

# Import routes
from routes.auth import auth_bp
from routes.products import products_bp
from routes.cart import cart_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Completely suppress werkzeug HTTP request logs
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    
    # Test MongoDB connection at startup
    try:
        client = MongoClient(Config.MONGODB_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print("MongoDB Atlas connected successfully")
        
        # Extract database name from URI or use default
        db_name = Config.MONGODB_URI.split('/')[-1].split('?')[0] or 'producthub'
        app.config['DB'] = client[db_name]
        app.config['MONGO_CLIENT'] = client
        
    except ServerSelectionTimeoutError as e:
        print(f"MongoDB connection failed: {e}")
        print("Check your MONGODB_URI in .env file")
        exit(1)
    except Exception as e:
        print(f"Database error: {e}")
        exit(1)
    
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
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    
    @app.route('/')
    def home():
        return jsonify({
            'message': 'Product Recommendation System API',
            'version': '1.0.0',
            'status': 'running',
            'database': 'MongoDB Connected',
            'timestamp': datetime.now().isoformat(),
            'endpoints': {
                'auth': '/api/auth',
                'products': '/api/products',
                'cart': '/api/cart'
            }
        })
    
    @app.route('/health')
    def health():
        # Test database connection in health check
        try:
            app.config['DB'].command('ping')
            return jsonify({
                'status': 'healthy',
                'database': 'connected',
                'timestamp': datetime.now().isoformat()
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'database': 'disconnected',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }), 503
    
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
    
    print("Starting Product Recommendation System")
    print(f"Server: http://{Config.HOST}:{Config.PORT}")
    print(f"Debug Mode: {Config.DEBUG}")
    app.run(debug=Config.DEBUG, host=Config.HOST, port=Config.PORT)

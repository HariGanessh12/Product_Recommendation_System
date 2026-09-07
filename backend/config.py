import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

class Config:
    # Database Configuration
    MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/producthub')
    MONGODB_DB_NAME = os.environ.get(
        'MONGODB_DB_NAME',
        MONGODB_URI.rsplit('/', 1)[-1].split('?', 1)[0] or 'producthub'
    )
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
    
    # Server Configuration
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    PORT = int(os.environ.get('PORT', 5000))
    HOST = os.environ.get('HOST', '0.0.0.0')
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get(
        'CORS_ORIGINS', 
        'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000'
    ).split(',')

    @classmethod
    def validate_production_config(cls):
        """Fail fast rather than deploying with unsafe development secrets."""
        if not cls.is_production():
            return

        required_values = {
            'MONGODB_URI': cls.MONGODB_URI,
            'JWT_SECRET_KEY': cls.JWT_SECRET_KEY,
            'SECRET_KEY': cls.SECRET_KEY,
        }
        missing = [name for name, value in required_values.items() if not value]
        insecure = [
            name for name, value in required_values.items()
            if value in {'dev-secret-key-change-in-production', 'dev-secret-change-in-production'}
        ]
        if missing or insecure:
            names = ', '.join(missing + insecure)
            raise RuntimeError(f'Production environment variables need secure values: {names}')
    
    # Additional utility methods
    @staticmethod
    def get_current_timestamp():
        return datetime.now().isoformat()
    
    @staticmethod
    def is_production():
        return os.environ.get('FLASK_ENV', 'development') == 'production'

from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from models import db
from datetime import datetime

class User:
    def __init__(self, username, email, password, role='buyer'):
        self.username = username
        self.email = email.lower()
        self.password_hash = generate_password_hash(password)
        self.role = role
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def save(self):
        user_data = {
            'username': self.username,
            'email': self.email,
            'password_hash': self.password_hash,
            'role': self.role,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
        result = db.users.insert_one(user_data)
        return str(result.inserted_id)

    @staticmethod
    def find_by_email(email):
        return db.users.find_one({'email': email.lower()})

    @staticmethod
    def find_by_id(user_id):
        try:
            return db.users.find_one({'_id': ObjectId(user_id)})
        except:
            return None

    @staticmethod
    def verify_password(user, password):
        if user and 'password_hash' in user:
            return check_password_hash(user['password_hash'], password)
        return False

    @staticmethod
    def user_exists(email):
        return db.users.find_one({'email': email.lower()}) is not None

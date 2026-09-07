from pymongo import MongoClient
from config import Config
import os

client = MongoClient(
    Config.MONGODB_URI,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
    socketTimeoutMS=30000
)

# Use the same explicit database selection as the Flask application.
db = client[Config.MONGODB_DB_NAME]

# Create indexes for better performance
try:
    db.users.create_index("email", unique=True)
    db.products.create_index([("name", "text"), ("description", "text")])
    db.products.create_index("category")
    db.products.create_index("price")
    print("Database indexes created successfully")
except Exception as e:
    print(f"Index creation warning: {e}")

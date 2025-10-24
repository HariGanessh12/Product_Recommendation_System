from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()  # Loads variables from .env file

mongo_uri = os.getenv('MONGODB_URI')
if not mongo_uri:
    raise Exception("MONGODB_URI not found in environment variables")

client = MongoClient(mongo_uri)
db = client['product_recommendation_system']

exclude_names = ["IPhone 16 Pro Max", "Apple 2024 MacBook Pro"]

db.products.update_many(
    {"name": {"$nin": exclude_names}},
    {"$set": {"stock": 20}}
)
db.products.update_one({"name": "IPhone 16 Pro Max"}, {"$set": {"stock": 0}})
db.products.update_one({"name": "Apple 2024 MacBook Pro"}, {"$set": {"stock": 1}})

print("Stock values updated successfully")

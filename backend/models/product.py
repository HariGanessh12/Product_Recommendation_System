from bson import ObjectId
from models import db
from datetime import datetime
import pymongo

class Product:
    def __init__(self, name, description, category, price, seller_id, seller_name, 
                 image_url=None, images=None, stock=0, tags=None, specifications=None):
        self.name = name
        self.description = description
        self.category = category
        self.price = float(price)
        self.seller_id = ObjectId(seller_id)
        self.seller_name = seller_name
        self.image_url = image_url or 'https://via.placeholder.com/500x500?text=No+Image'
        self.images = images or []
        self.rating = 0.0
        self.reviews_count = 0
        self.wishlist_count = 0
        self.stock = int(stock)
        self.tags = tags or []
        self.specifications = specifications or {}
        self.is_active = True
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def save(self):
        product_data = {
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'price': self.price,
            'seller_id': self.seller_id,
            'seller_name': self.seller_name,
            'image_url': self.image_url,
            'images': self.images,
            'rating': self.rating,
            'reviews_count': self.reviews_count,
            'wishlist_count': self.wishlist_count,
            'stock': self.stock,
            'tags': self.tags,
            'specifications': self.specifications,
            'is_active': self.is_active,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
        result = db.products.insert_one(product_data)
        return str(result.inserted_id)

    @staticmethod
    def find_all(filters=None, sort_by='name', page=1, limit=50):
        query = {'is_active': True}
        
        if filters:
            # Search filter
            if filters.get('search'):
                search_term = filters['search']
                query['$or'] = [
                    {'name': {'$regex': search_term, '$options': 'i'}},
                    {'description': {'$regex': search_term, '$options': 'i'}}
                ]
            
            # Category filter
            if filters.get('category') and filters['category'] != 'all':
                query['category'] = filters['category']
            
            # Price filter
            min_price = float(filters.get('minPrice', 0))
            max_price = float(filters.get('maxPrice', 10000))
            query['price'] = {'$gte': min_price, '$lte': max_price}

        # Sort options
        sort_options = {
            'name': [('name', pymongo.ASCENDING)],
            'price-low': [('price', pymongo.ASCENDING)],
            'price-high': [('price', pymongo.DESCENDING)],
            'rating': [('rating', pymongo.DESCENDING)],
            'popularity': [('wishlist_count', pymongo.DESCENDING)],
            'newest': [('created_at', pymongo.DESCENDING)]
        }
        
        sort = sort_options.get(sort_by, [('name', pymongo.ASCENDING)])
        
        # Execute query with pagination
        skip = (int(page) - 1) * int(limit)
        cursor = db.products.find(query).sort(sort).skip(skip).limit(int(limit))
        products = list(cursor)
        
        # Convert ObjectId to string
        for product in products:
            product['_id'] = str(product['_id'])
            product['seller_id'] = str(product['seller_id'])
        
        # Get total count
        total = db.products.count_documents(query)
        
        return products, total

    @staticmethod
    def find_by_id(product_id):
        try:
            product = db.products.find_one({'_id': ObjectId(product_id)})
            if product:
                product['_id'] = str(product['_id'])
                product['seller_id'] = str(product['seller_id'])
            return product
        except:
            return None

    @staticmethod
    def find_by_seller(seller_id):
        try:
            cursor = db.products.find({
                'seller_id': ObjectId(seller_id),
                'is_active': True
            })
            products = list(cursor)
            
            for product in products:
                product['_id'] = str(product['_id'])
                product['seller_id'] = str(product['seller_id'])
            
            return products
        except:
            return []

    @staticmethod
    def update_by_id(product_id, updates):
        try:
            updates['updated_at'] = datetime.utcnow()
            result = db.products.update_one(
                {'_id': ObjectId(product_id)},
                {'$set': updates}
            )
            if result.modified_count > 0:
                return Product.find_by_id(product_id)
            return None
        except:
            return None

    @staticmethod
    def delete_by_id(product_id):
        try:
            result = db.products.delete_one({'_id': ObjectId(product_id)})
            return result.deleted_count > 0
        except:
            return False

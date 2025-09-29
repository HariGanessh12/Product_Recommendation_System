from models.user import User
from models.product import Product
from models import db

def seed_users():
    users = [
        {'username': 'John Buyer', 'email': 'buyer@example.com', 'password': 'password', 'role': 'buyer'},
        {'username': 'Jane Seller', 'email': 'seller@example.com', 'password': 'password', 'role': 'seller'},
        {'username': 'Admin User', 'email': 'admin@example.com', 'password': 'password', 'role': 'admin'}
    ]
    
    for user_data in users:
        if not User.user_exists(user_data['email']):
            user = User(user_data['username'], user_data['email'], user_data['password'], user_data['role'])
            user.save()
            print(f"✅ Created user: {user_data['email']}")
        else:
            print(f"⚠️  User already exists: {user_data['email']}")

def seed_products():
    seller = User.find_by_email('seller@example.com')
    if not seller:
        print("❌ Seller not found. Create users first.")
        return
    
    products = [
        {
            'name': 'Wireless Bluetooth Headphones',
            'description': 'Premium quality wireless headphones with noise cancellation and 30-hour battery life.',
            'category': 'Electronics',
            'price': 199.99,
            'image_url': 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=500',
            'stock': 25
        },
        {
            'name': 'Smart Fitness Watch',
            'description': 'Track your fitness goals with this advanced smartwatch featuring heart rate monitoring and GPS.',
            'category': 'Electronics',
            'price': 299.99,
            'image_url': 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=500',
            'stock': 15
        },
        {
            'name': 'Professional Camera Lens',
            'description': '85mm f/1.4 lens perfect for portrait photography with beautiful bokeh effects.',
            'category': 'Photography',
            'price': 1299.99,
            'image_url': 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=500',
            'stock': 8
        },
        {
            'name': 'Ergonomic Office Chair',
            'description': 'Comfortable office chair with lumbar support and adjustable height for long work sessions.',
            'category': 'Furniture',
            'price': 449.99,
            'image_url': 'https://images.pexels.com/photos/586750/pexels-photo-586750.jpeg?auto=compress&cs=tinysrgb&w=500',
            'stock': 12
        }
    ]
    
    for product_data in products:
        product = Product(
            seller_id=str(seller['_id']),
            seller_name=seller['username'],
            **product_data
        )
        product.save()
        print(f"✅ Created product: {product_data['name']}")

if __name__ == '__main__':
    print("🌱 Seeding database...")
    seed_users()
    seed_products()
    print("✅ Database seeded successfully!")

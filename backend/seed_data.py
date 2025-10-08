from models.user import User
from models.product import Product
from models import db

# Add this at the end of your existing seed_data.py file

# Update existing users to add status field
def add_status_to_existing_users():
    print("\n" + "="*50)
    print("ADDING STATUS FIELD TO EXISTING USERS")
    print("="*50)
    
    # Add status field to all users who don't have it
    result = db.users.update_many(
        {"status": {"$exists": False}},  # Users without status field
        {"$set": {"status": "active"}}   # Set status to active
    )
    
    print(f"✅ Updated {result.modified_count} users with status field")
    
    # Verify the update
    users_with_status = db.users.count_documents({"status": {"$exists": True}})
    total_users = db.users.count_documents({})
    
    print(f"✅ Users with status field: {users_with_status}/{total_users}")
    print("="*50)

# Call the function
if __name__ == "__main__":
    # Your existing seed_data.py code here...
    # (keep all your existing code)
    
    # Add this new function call
    add_status_to_existing_users()

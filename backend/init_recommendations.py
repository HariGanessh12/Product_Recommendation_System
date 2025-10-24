from services.recommendation_service import recommendation_service

if __name__ == '__main__':
    print("Initializing S-BERT recommendation system...")
    print("This may take a few minutes on first run...")
    
    success = recommendation_service.generate_all_embeddings()
    
    if success:
        print("Recommendation system initialized successfully")
    else:
        print("Failed to initialize recommendation system")

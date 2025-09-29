import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';

const RecommendationContext = createContext();

export const useRecommendations = () => {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error('useRecommendations must be used within a RecommendationProvider');
  }
  return context;
};

export const RecommendationProvider = ({ children }) => {
  const { user } = useAuth();
  const { products } = useProducts();
  const [wishlist, setWishlist] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, products]);

  const loadUserData = () => {
    const userWishlist = JSON.parse(localStorage.getItem(`wishlist_${user.id}`) || '[]');
    const userReviews = JSON.parse(localStorage.getItem(`reviews_${user.id}`) || '[]');
    
    setWishlist(userWishlist);
    setReviews(userReviews);
    
    generateRecommendations(userWishlist, userReviews);
  };

  const generateRecommendations = (userWishlist, userReviews) => {
    if (!user || products.length === 0) return;

    // Simple content-based recommendation algorithm
    const wishlistCategories = userWishlist.map(item => {
      const product = products.find(p => p.id === item.productId);
      return product?.category;
    }).filter(Boolean);

    const reviewedCategories = userReviews.map(review => {
      const product = products.find(p => p.id === review.productId);
      return product?.category;
    }).filter(Boolean);

    const preferredCategories = [...new Set([...wishlistCategories, ...reviewedCategories])];
    
    const recommended = products
      .filter(product => 
        preferredCategories.includes(product.category) &&
        !userWishlist.some(item => item.productId === product.id) &&
        !userReviews.some(review => review.productId === product.id)
      )
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);

    // Fallback to popular products if no preferences
    if (recommended.length === 0) {
      const popular = products
        .sort((a, b) => b.wishlist_count - a.wishlist_count)
        .slice(0, 6);
      setRecommendations(popular);
    } else {
      setRecommendations(recommended);
    }
  };

  const addToWishlist = (productId) => {
    if (!user) return false;

    const newItem = {
      id: Date.now().toString(),
      productId,
      userId: user.id,
      timestamp: new Date().toISOString()
    };

    const updatedWishlist = [...wishlist, newItem];
    setWishlist(updatedWishlist);
    localStorage.setItem(`wishlist_${user.id}`, JSON.stringify(updatedWishlist));
    
    generateRecommendations(updatedWishlist, reviews);
    return true;
  };

  const removeFromWishlist = (productId) => {
    if (!user) return;

    const updatedWishlist = wishlist.filter(item => item.productId !== productId);
    setWishlist(updatedWishlist);
    localStorage.setItem(`wishlist_${user.id}`, JSON.stringify(updatedWishlist));
    
    generateRecommendations(updatedWishlist, reviews);
  };

  const addReview = (productId, rating, reviewText) => {
    if (!user) return false;

    const newReview = {
      id: Date.now().toString(),
      productId,
      userId: user.id,
      username: user.username,
      rating,
      reviewText,
      timestamp: new Date().toISOString()
    };

    const updatedReviews = [...reviews, newReview];
    setReviews(updatedReviews);
    localStorage.setItem(`reviews_${user.id}`, JSON.stringify(updatedReviews));
    
    // Also store in global reviews
    const allReviews = JSON.parse(localStorage.getItem('all_reviews') || '[]');
    localStorage.setItem('all_reviews', JSON.stringify([...allReviews, newReview]));
    
    generateRecommendations(wishlist, updatedReviews);
    return true;
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.productId === productId);
  };

  const getUserReview = (productId) => {
    return reviews.find(review => review.productId === productId);
  };

  const getAllReviews = (productId) => {
    const allReviews = JSON.parse(localStorage.getItem('all_reviews') || '[]');
    return allReviews.filter(review => review.productId === productId);
  };

  const value = {
    wishlist,
    reviews,
    recommendations,
    addToWishlist,
    removeFromWishlist,
    addReview,
    isInWishlist,
    getUserReview,
    getAllReviews
  };

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
};
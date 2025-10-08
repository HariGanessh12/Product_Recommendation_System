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
    } else {
      setWishlist([]);
      setReviews([]);
      setRecommendations([]);
    }
  }, [user, products]);

  const loadUserData = () => {
    try {
      const savedWishlist = localStorage.getItem(`wishlist_${user.id}`);
      let userWishlist = [];
      
      if (savedWishlist) {
        const parsed = JSON.parse(savedWishlist);
        if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0].productId) {
          userWishlist = parsed.map(item => item.productId);
        } else {
          userWishlist = parsed;
        }
      }
      
      const userReviews = JSON.parse(localStorage.getItem(`reviews_${user.id}`) || '[]');
      
      setWishlist(userWishlist);
      setReviews(userReviews);
      
      generateRecommendations(userWishlist, userReviews);
    } catch (error) {
      console.error('Error loading user data:', error);
      setWishlist([]);
      setReviews([]);
    }
  };

  const generateRecommendations = (userWishlist, userReviews) => {
    if (!user || products.length === 0) return;

    const wishlistCategories = userWishlist.map(productId => {
      const product = products.find(p => (p.id || p._id) === productId);
      return product?.category;
    }).filter(Boolean);

    const reviewedCategories = userReviews.map(review => {
      const product = products.find(p => (p.id || p._id) === review.productId);
      return product?.category;
    }).filter(Boolean);

    const preferredCategories = [...new Set([...wishlistCategories, ...reviewedCategories])];
    
    const recommended = products
      .filter(product => {
        const productId = product.id || product._id;
        return preferredCategories.includes(product.category) &&
               !userWishlist.includes(productId) &&
               !userReviews.some(review => review.productId === productId);
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);

    if (recommended.length === 0) {
      const popular = products
        .filter(product => {
          const productId = product.id || product._id;
          return !userWishlist.includes(productId);
        })
        .sort((a, b) => (b.wishlist_count || 0) - (a.wishlist_count || 0))
        .slice(0, 6);
      setRecommendations(popular);
    } else {
      setRecommendations(recommended);
    }
  };

  const addToWishlist = (productId) => {
    if (!user || !productId) return false;

    if (wishlist.includes(productId)) {
      return false;
    }

    const updatedWishlist = [...wishlist, productId];
    setWishlist(updatedWishlist);
    localStorage.setItem(`wishlist_${user.id}`, JSON.stringify(updatedWishlist));
    
    generateRecommendations(updatedWishlist, reviews);
    return true;
  };

  const removeFromWishlist = (productId) => {
    if (!user || !productId) return;

    const updatedWishlist = wishlist.filter(id => id !== productId);
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
    
    const allReviews = JSON.parse(localStorage.getItem('all_reviews') || '[]');
    localStorage.setItem('all_reviews', JSON.stringify([...allReviews, newReview]));
    
    generateRecommendations(wishlist, updatedReviews);
    return true;
  };

  // Optimized isInWishlist - no logging
  const isInWishlist = (productId) => {
    return wishlist.includes(productId);
  };

  const getUserReview = (productId) => {
    return reviews.find(review => review.productId === productId);
  };

  const getAllReviews = (productId) => {
    const allReviews = JSON.parse(localStorage.getItem('all_reviews') || '[]');
    return allReviews.filter(review => review.productId === productId);
  };

  const clearWishlist = () => {
    setWishlist([]);
    if (user) {
      localStorage.removeItem(`wishlist_${user.id}`);
    }
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
    getAllReviews,
    clearWishlist
  };

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
};

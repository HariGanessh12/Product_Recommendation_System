import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';

const RecommendationContext = createContext();

// API base URL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api').replace(/\/$/, '');

export const useRecommendations = () => {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error('useRecommendations must be used within a RecommendationProvider');
  }
  return context;
};

export const RecommendationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { products } = useProducts();
  const [wishlist, setWishlist] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  // Enhanced recommendation state
  const [sbertRecommendations, setSbertRecommendations] = useState({
    similar: {},
    personalized: [],
    popular: [],
    trending: []
  });
  
  // NEW: Hybrid recommendations state
  const [hybridRecommendations, setHybridRecommendations] = useState({
    personalized: [],
    similar: {},
    cf_personalized: [],
    cf_similar: {}
  });
  
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  
  // NEW: Algorithm performance tracking
  const [algorithmPreference, setAlgorithmPreference] = useState('hybrid'); // hybrid, content, cf

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      clearAllRecommendations();
    }
  }, [user, products]);

  // NEW: Auto-refresh every 60 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh immediately on login
    loadAllRecommendations();

    // Set up auto-refresh every 60 seconds (1 minute)
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing recommendations...');
      loadAllRecommendations();
    }, 60000); // 60 seconds

    // Cleanup interval on unmount or logout
    return () => {
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated]); // Only depend on authentication status

  // Listen for cart update events (ONLY ONE - removed duplicate)
  useEffect(() => {
    const handleCartUpdate = (event) => {
      console.log('Cart updated', event.detail);
      // Track cart action but don't trigger immediate refresh
      trackCartAction(event.detail.productId, event.detail.action, event.detail.quantity);
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, []);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Clear all caches
  const clearCache = () => {
    setSbertRecommendations({
      similar: {},
      personalized: [],
      popular: [],
      trending: []
    });
    setHybridRecommendations({
      personalized: [],
      similar: {},
      cf_personalized: [],
      cf_similar: {}
    });
  };

  const clearAllRecommendations = () => {
    setWishlist([]);
    setReviews([]);
    setRecommendations([]);
    clearCache();
  };

  // Load user data (existing function)
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

  // NEW: Load all types of recommendations
  const loadAllRecommendations = async () => {
    if (!isAuthenticated) {
      await getSbertPopularProducts();
      return;
    }

    setIsLoadingRecommendations(true);
    try {
      await Promise.all([
        // Hybrid recommendations (primary)
        getHybridPersonalizedRecommendations(),
        
        // Individual algorithms for comparison
        getSbertPersonalizedRecommendations(),
        getCFPersonalizedRecommendations(),
        
        // General recommendations
        getSbertPopularProducts(),
        getSbertTrendingProducts()
      ]);
    } catch (error) {
      console.error('Error loading all recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const loadSbertRecommendations = async () => {
    if (!isAuthenticated) {
      await getSbertPopularProducts();
      return;
    }

    setIsLoadingRecommendations(true);
    try {
      await Promise.all([
        getSbertPersonalizedRecommendations(),
        getSbertPopularProducts(),
        getSbertTrendingProducts()
      ]);
    } catch (error) {
      console.error('Error loading S-BERT recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // NEW: Hybrid Recommendations
  const getHybridPersonalizedRecommendations = async (limit = 10) => {
    if (!isAuthenticated) return [];

    try {
      const response = await fetch(
        `${API_BASE_URL}/recommendations/hybrid/personalized?limit=${limit}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error('Failed to fetch hybrid personalized recommendations');

      const data = await response.json();
      
      setHybridRecommendations(prev => ({
        ...prev,
        personalized: data.recommendations
      }));

      return data.recommendations;
    } catch (error) {
      console.error('Error fetching hybrid personalized recommendations:', error);
      return [];
    }
  };

  const getHybridSimilarProducts = async (productId, limit = 6, minSimilarity = 0.2) => {
    const cacheKey = `${productId}_${limit}_${minSimilarity}`;
    
    if (hybridRecommendations.similar[cacheKey]) {
      return hybridRecommendations.similar[cacheKey];
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/recommendations/hybrid/similar/${productId}?limit=${limit}&min_similarity=${minSimilarity}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error('Failed to fetch hybrid similar products');

      const data = await response.json();

      setHybridRecommendations(prev => ({
        ...prev,
        similar: {
          ...prev.similar,
          [cacheKey]: data.recommendations
        }
      }));

      return data.recommendations;
    } catch (error) {
      console.error('Error fetching hybrid similar products:', error);
      return [];
    }
  };

  // NEW: Pure Collaborative Filtering
  const getCFPersonalizedRecommendations = async (limit = 10) => {
    if (!isAuthenticated) return [];

    try {
      const response = await fetch(
        `${API_BASE_URL}/recommendations/cf-personalized?limit=${limit}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error('Failed to fetch CF personalized recommendations');

      const data = await response.json();
      
      setHybridRecommendations(prev => ({
        ...prev,
        cf_personalized: data.recommendations
      }));

      return data.recommendations;
    } catch (error) {
      console.error('Error fetching CF personalized recommendations:', error);
      return [];
    }
  };

  const getCFSimilarProducts = async (productId, limit = 6) => {
    const cacheKey = `cf_${productId}_${limit}`;
    
    if (hybridRecommendations.cf_similar[cacheKey]) {
      return hybridRecommendations.cf_similar[cacheKey];
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/recommendations/cf-similar/${productId}?limit=${limit}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error('Failed to fetch CF similar products');

      const data = await response.json();

      setHybridRecommendations(prev => ({
        ...prev,
        cf_similar: {
          ...prev.cf_similar,
          [cacheKey]: data.recommendations
        }
      }));

      return data.recommendations;
    } catch (error) {
      console.error('Error fetching CF similar products:', error);
      return [];
    }
  };

  // Enhanced S-BERT functions (keeping existing ones)
  const getSbertSimilarProducts = async (productId, limit = 6, minSimilarity = 0.3) => {
    const cacheKey = `${productId}_${limit}_${minSimilarity}`;
    
    if (sbertRecommendations.similar[cacheKey]) {
      return sbertRecommendations.similar[cacheKey];
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/recommendations/similar/${productId}?limit=${limit}&min_similarity=${minSimilarity}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error('Failed to fetch similar products');

      const data = await response.json();

      setSbertRecommendations(prev => ({
        ...prev,
        similar: {
          ...prev.similar,
          [cacheKey]: data.recommendations
        }
      }));

      return data.recommendations;
    } catch (error) {
      console.error('Error fetching similar products:', error);
      return [];
    }
  };

  const getSbertPersonalizedRecommendations = async (limit = 10) => {
    if (!isAuthenticated) return [];

    try {
      const response = await fetch(
        `${API_BASE_URL}/recommendations/personalized?limit=${limit}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error('Failed to fetch personalized recommendations');

      const data = await response.json();
      
      setSbertRecommendations(prev => ({
        ...prev,
        personalized: data.recommendations
      }));

      return data.recommendations;
    } catch (error) {
      console.error('Error fetching personalized recommendations:', error);
      return [];
    }
  };

  const getSbertPopularProducts = async (limit = 10) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/recommendations/popular?limit=${limit}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error('Failed to fetch popular products');

      const data = await response.json();
      
      setSbertRecommendations(prev => ({
        ...prev,
        popular: data.recommendations
      }));

      return data.recommendations;
    } catch (error) {
      console.error('Error fetching popular products:', error);
      return [];
    }
  };

  const getSbertTrendingProducts = async (limit = 10, days = 7) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/recommendations/trending?limit=${limit}&days=${days}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error('Failed to fetch trending products');

      const data = await response.json();
      
      setSbertRecommendations(prev => ({
        ...prev,
        trending: data.recommendations
      }));

      return data.recommendations;
    } catch (error) {
      console.error('Error fetching trending products:', error);
      return [];
    }
  };

  // Enhanced tracking functions
  const trackProductView = async (productId, source = 'product_page') => {
    if (!isAuthenticated) return;
    
    try {
      await fetch(`${API_BASE_URL}/analytics/track-view`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_id: productId,
          source: source,
          session_id: Date.now().toString()
        })
      });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const trackRecommendationClick = async (productId, recommendationType, sourceProductId = null, scores = {}) => {
    if (!isAuthenticated) return;
    
    try {
      await fetch(`${API_BASE_URL}/analytics/track-recommendation-click`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_id: productId,
          recommendation_type: recommendationType,
          source_product_id: sourceProductId,
          similarity_score: scores.similarity_score,
          hybrid_score: scores.hybrid_score,
          cf_score: scores.cf_score,
          content_score: scores.content_score,
          algorithm: scores.algorithm || algorithmPreference
        })
      });
    } catch (error) {
      console.error('Failed to track recommendation click:', error);
    }
  };

  // NEW: Track cart and wishlist actions
  const trackCartAction = async (productId, action, quantity = 1) => {
    if (!isAuthenticated) return;
    
    try {
      await fetch(`${API_BASE_URL}/analytics/track-cart-action`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_id: productId,
          action: action,
          quantity: quantity
        })
      });
    } catch (error) {
      console.error('Failed to track cart action:', error);
    }
  };

  const trackWishlistAction = async (productId, action) => {
    if (!isAuthenticated) return;
    
    try {
      await fetch(`${API_BASE_URL}/analytics/track-wishlist-action`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_id: productId,
          action: action
        })
      });
    } catch (error) {
      console.error('Failed to track wishlist action:', error);
    }
  };

  // FIXED: Enhanced wishlist functions with backend integration (removed immediate refresh)
  const addToWishlist = async (productId) => {
    if (!user || !productId) return false;

    if (wishlist.includes(productId)) {
      return false;
    }

    try {
      // Call backend API
      const response = await fetch(`${API_BASE_URL}/wishlist/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_id: productId
        })
      });

      if (response.ok) {
        // Update local state
        const updatedWishlist = [...wishlist, productId];
        setWishlist(updatedWishlist);
        localStorage.setItem(`wishlist_${user.id}`, JSON.stringify(updatedWishlist));
        
        generateRecommendations(updatedWishlist, reviews);
        
        // REMOVED immediate tracking and refresh - will happen on auto-refresh
        // trackWishlistAction(productId, 'add');     // Removed
        // setRefreshTrigger(prev => prev + 1);      // Removed
        
        return true;
      } else {
        console.error('Failed to add to wishlist:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!user || !productId) return;

    try {
      // Call backend API
      const response = await fetch(`${API_BASE_URL}/wishlist/remove`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_id: productId
        })
      });

      if (response.ok) {
        // Update local state
        const updatedWishlist = wishlist.filter(id => id !== productId);
        setWishlist(updatedWishlist);
        localStorage.setItem(`wishlist_${user.id}`, JSON.stringify(updatedWishlist));
        
        generateRecommendations(updatedWishlist, reviews);
        
        // REMOVED immediate tracking and refresh - will happen on auto-refresh
        // trackWishlistAction(productId, 'remove');  // Removed
        // setRefreshTrigger(prev => prev + 1);       // Removed
      } else {
        console.error('Failed to remove from wishlist:', await response.text());
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
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
    // REMOVED immediate refresh - will happen on auto-refresh
    // setRefreshTrigger(prev => prev + 1);  // Removed
    
    return true;
  };

  // NEW: Get recommendations based on algorithm preference
  const getRecommendationsByAlgorithm = (algorithm = algorithmPreference) => {
    switch (algorithm) {
      case 'hybrid':
        return hybridRecommendations.personalized;
      case 'content':
        return sbertRecommendations.personalized;
      case 'cf':
        return hybridRecommendations.cf_personalized;
      default:
        return hybridRecommendations.personalized.length > 0 
          ? hybridRecommendations.personalized 
          : sbertRecommendations.personalized;
    }
  };

  const getSimilarProductsByAlgorithm = (productId, algorithm = algorithmPreference) => {
    const cacheKey = `${productId}_6_0.3`; // Default cache key format

    switch (algorithm) {
      case 'hybrid':
        const hybridCacheKey = `${productId}_6_0.2`;
        return hybridRecommendations.similar[hybridCacheKey] || [];
      case 'content':
        return sbertRecommendations.similar[cacheKey] || [];
      case 'cf':
        return hybridRecommendations.cf_similar[`cf_${productId}_6`] || [];
      default:
        return hybridRecommendations.similar[`${productId}_6_0.2`] || 
               sbertRecommendations.similar[cacheKey] || [];
    }
  };

  // Existing helper functions
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
    // Existing functionality
    wishlist,
    reviews,
    recommendations,
    addToWishlist,
    removeFromWishlist,
    addReview,
    isInWishlist,
    getUserReview,
    getAllReviews,
    clearWishlist,
    
    // Enhanced S-BERT functionality
    sbertRecommendations,
    getSbertSimilarProducts,
    getSbertPersonalizedRecommendations,
    getSbertPopularProducts,
    getSbertTrendingProducts,
    loadSbertRecommendations,
    
    // NEW: Hybrid functionality
    hybridRecommendations,
    getHybridPersonalizedRecommendations,
    getHybridSimilarProducts,
    getCFPersonalizedRecommendations,
    getCFSimilarProducts,
    
    // Algorithm selection and comparison
    algorithmPreference,
    setAlgorithmPreference,
    getRecommendationsByAlgorithm,
    getSimilarProductsByAlgorithm,
    
    // Enhanced tracking
    trackProductView,
    trackRecommendationClick,
    trackCartAction,
    trackWishlistAction,
    
    // Utility functions
    isLoadingRecommendations,
    loadAllRecommendations,
    refreshRecommendations: () => loadAllRecommendations(), // FIXED: Direct call instead of trigger
    clearCache
  };

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
};

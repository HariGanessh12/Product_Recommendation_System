import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { useRecommendations } from '../contexts/RecommendationContext';
import ProductCard from '../components/ProductCard';
import { TrendingUp, Star, Heart, ShoppingBag, Sparkles, Zap, Users, Brain } from 'lucide-react';

const Dashboard = ({ onAuthRequired }) => {
  const { user, isAuthenticated } = useAuth();
  const { products } = useProducts();
  const { 
    recommendations, 
    wishlist,
    sbertRecommendations,
    isLoadingRecommendations,
    loadSbertRecommendations,
    trackProductView 
  } = useRecommendations();
  const [realUsers, setRealUsers] = useState([]);

  // Load real users data
  useEffect(() => {
    const loadRealUsers = () => {
      const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
      const authUsers = JSON.parse(localStorage.getItem('auth_users') || '[]');
      
      // Combine and deduplicate users
      const combinedUsers = [...allUsers, ...authUsers];
      const uniqueUsers = combinedUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.email === user.email || u.id === user.id)
      );
      
      setRealUsers(uniqueUsers);
    };

    loadRealUsers();
  }, []);

  // Load S-BERT recommendations on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSbertRecommendations();
    }
  }, [isAuthenticated, loadSbertRecommendations]);

  const featuredProducts = products.slice(0, 8);
  const popularProducts = products.sort((a, b) => (b.wishlist_count || 0) - (a.wishlist_count || 0)).slice(0, 8);

  // Handle product click with tracking
  const handleProductClick = (product) => {
    const productId = product._id || product.id;
    trackProductView(productId, 'dashboard');
  };

  // Calculate real seller metrics
  const getSellerMetrics = () => {
    const sellerProducts = products.filter(p => (p.seller_id || p.seller) === user.id);
    const totalRating = sellerProducts.reduce((sum, p) => sum + (p.rating || 0), 0);
    const avgRating = sellerProducts.length > 0 ? totalRating / sellerProducts.length : 0;
    const totalRevenue = sellerProducts.reduce((sum, p) => 
      sum + ((p.price || 0) * (p.wishlist_count || 0) * 0.1), 0
    );

    return {
      productCount: sellerProducts.length,
      avgRating: avgRating,
      totalRevenue: totalRevenue
    };
  };

  // Calculate real admin metrics
  const getAdminMetrics = () => {
    const totalReviews = products.reduce((sum, p) => sum + (p.reviews_count || 0), 0);
    const totalWishlistItems = products.reduce((sum, p) => sum + (p.wishlist_count || 0), 0);
    
    // Calculate estimated revenue based on wishlist activity
    const conversionRate = 0.05; // 5% conversion rate
    const platformFee = 0.10; // 10% platform fee
    const estimatedRevenue = products.reduce((sum, product) => {
      const estimatedSales = (product.wishlist_count || 0) * conversionRate;
      const productRevenue = estimatedSales * (product.price || 0) * platformFee;
      return sum + productRevenue;
    }, 0);

    return {
      totalReviews,
      totalWishlistItems,
      estimatedRevenue
    };
  };

  const getGreeting = () => {
    if (!isAuthenticated) return "Welcome to ProductHub";
    
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${timeGreeting}, ${user.username}!`;
  };

  const getDashboardContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Discover Amazing Products
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Sign in to get AI-powered personalized recommendations, save your favorite items to wishlist, and write reviews.
          </p>
          <button
            onClick={onAuthRequired}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Get Started
          </button>
        </div>
      );
    }

    switch (user.role) {
      case 'buyer':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <Heart className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Wishlist</h3>
                  <p className="text-2xl font-bold text-blue-600">{wishlist.length}</p>
                  <p className="text-gray-600 text-sm">Items saved</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <Star className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {JSON.parse(localStorage.getItem(`reviews_${user.id}`) || '[]').length}
                  </p>
                  <p className="text-gray-600 text-sm">Reviews written</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <Brain className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {sbertRecommendations.personalized.length}
                  </p>
                  <p className="text-gray-600 text-sm">Powered by S-BERT</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'seller': {
        const sellerMetrics = getSellerMetrics();
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Products</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {sellerMetrics.productCount}
                  </p>
                  <p className="text-gray-600 text-sm">Listed products</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <Star className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Avg Rating</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {sellerMetrics.avgRating.toFixed(1)}
                  </p>
                  <p className="text-gray-600 text-sm">Customer satisfaction</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Estimated Revenue</h3>
                  <p className="text-2xl font-bold text-orange-600">
                    ${sellerMetrics.totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-gray-600 text-sm">Based on activity</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      case 'admin': {
        const adminMetrics = getAdminMetrics();
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Products</h3>
                  <p className="text-2xl font-bold text-blue-600">{products.length}</p>
                  <p className="text-gray-600 text-sm">Total products</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <Star className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {adminMetrics.totalReviews}
                  </p>
                  <p className="text-gray-600 text-sm">Total reviews</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <Heart className="h-8 w-8 text-orange-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Wishlists</h3>
                  <p className="text-2xl font-bold text-orange-600">
                    {adminMetrics.totalWishlistItems}
                  </p>
                  <p className="text-gray-600 text-sm">Total wishlist items</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Revenue</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    ${adminMetrics.estimatedRevenue.toFixed(2)}
                  </p>
                  <p className="text-gray-600 text-sm">Estimated</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {getGreeting()}
        </h1>
        {isAuthenticated && (
          <p className="text-gray-600 capitalize">
            {user.role} Dashboard
          </p>
        )}
      </div>

      {/* Dashboard Stats */}
      {getDashboardContent()}

      {/* AI-Powered Personalized Recommendations for Buyers */}
      {isAuthenticated && user.role === 'buyer' && sbertRecommendations.personalized.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">AI Recommendations for You</h2>
              <div className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                S-BERT Powered
              </div>
            </div>
            {isLoadingRecommendations && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Loading AI recommendations...</span>
              </div>
            )}
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg mb-6">
            <p className="text-gray-700 text-sm">
              <Sparkles className="h-4 w-4 inline text-purple-600 mr-1" />
              These recommendations are generated using advanced AI that understands product semantics and your preferences. 
              Each suggestion includes an explanation of why it matches your interests.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sbertRecommendations.personalized.slice(0, 8).map(product => (
              <div key={product.id} className="relative">
                <ProductCard 
                  product={product} 
                  onClick={() => handleProductClick(product)}
                />
                {/* AI Explanation Badge */}
                {product.explanation && (
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <Brain className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-800">{product.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trending Products (S-BERT powered) */}
      {sbertRecommendations.trending.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center space-x-2 mb-6">
            <Zap className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-900">Trending Now</h2>
            <div className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
              AI Detected
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sbertRecommendations.trending.slice(0, 8).map(product => (
              <div key={product.id} className="relative">
                <ProductCard 
                  product={product} 
                  onClick={() => handleProductClick(product)}
                />
                {/* Trending Stats */}
                {(product.view_count || product.unique_viewers) && (
                  <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
                    <div className="flex items-center justify-between text-xs text-orange-800">
                      <span>{product.view_count} views</span>
                      <span>{product.unique_viewers} users</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fallback: Traditional Recommendations for Buyers */}
      {isAuthenticated && user.role === 'buyer' && recommendations.length > 0 && sbertRecommendations.personalized.length === 0 && (
        <section className="mb-12">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Recommended For You</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map(product => (
              <ProductCard 
                key={product._id || product.id} 
                product={product}
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Popular Products (Enhanced with S-BERT data) */}
      <section className="mb-12">
        <div className="flex items-center space-x-2 mb-6">
          <Star className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-900">Popular Products</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(sbertRecommendations.popular.length > 0 ? sbertRecommendations.popular : popularProducts).slice(0, 8).map(product => (
            <ProductCard 
              key={product.id || product._id} 
              product={product}
              onClick={() => handleProductClick(product)}
            />
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section>
        <div className="flex items-center space-x-2 mb-6">
          <ShoppingBag className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map(product => (
            <ProductCard 
              key={product._id || product.id} 
              product={product}
              onClick={() => handleProductClick(product)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

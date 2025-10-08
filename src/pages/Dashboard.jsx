import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { useRecommendations } from '../contexts/RecommendationContext';
import ProductCard from '../components/ProductCard';
import { TrendingUp, Star, Heart, ShoppingBag } from 'lucide-react';

const Dashboard = ({ onAuthRequired }) => {
  const { user, isAuthenticated } = useAuth();
  const { products } = useProducts();
  const { recommendations, wishlist } = useRecommendations();
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

  const featuredProducts = products.slice(0, 6);
  const popularProducts = products.sort((a, b) => (b.wishlist_count || 0) - (a.wishlist_count || 0)).slice(0, 4);

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
            Sign in to get personalized recommendations, save your favorite items to wishlist, and write reviews.
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
            
            <div className="bg-orange-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
                  <p className="text-2xl font-bold text-orange-600">{recommendations.length}</p>
                  <p className="text-gray-600 text-sm">Just for you</p>
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

      {/* Personalized Recommendations for Buyers */}
      {isAuthenticated && user.role === 'buyer' && recommendations.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Recommended For You</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map(product => (
              <ProductCard key={product._id || product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Popular Products */}
      <section className="mb-12">
        <div className="flex items-center space-x-2 mb-6">
          <Star className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-900">Popular Products</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularProducts.map(product => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section>
        <div className="flex items-center space-x-2 mb-6">
          <ShoppingBag className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProducts.map(product => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

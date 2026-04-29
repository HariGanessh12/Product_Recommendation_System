import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { TrendingUp, Users, Star, Package, Heart } from 'lucide-react';

const Analytics = () => {
  const { user } = useAuth();
  const { products } = useProducts();
  const [timeRange, setTimeRange] = useState('30');
  const [realUsers, setRealUsers] = useState([]);

  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'seller';

  useEffect(() => {
    const loadRealUsers = () => {
      const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
      const authUsers = JSON.parse(localStorage.getItem('auth_users') || '[]');
      const combinedUsers = [...allUsers, ...authUsers];
      const uniqueUsers = combinedUsers.filter((user, index, self) =>
        index === self.findIndex(u => u.email === user.email || u.id === user.id)
      );
      setRealUsers(uniqueUsers);
    };
    loadRealUsers();
  }, []);

  // Analytics calculation functions...
  const getAnalyticsData = () => {
    if (isAdmin) {
      const totalRating = products.reduce((sum, p) => sum + (p.rating || 0), 0);
      return {
        totalProducts: products.length,
        totalUsers: realUsers.length,
        totalReviews: products.reduce((sum, p) => sum + (p.reviews_count || 0), 0),
        totalWishlistItems: products.reduce((sum, p) => sum + (p.wishlist_count || 0), 0),
        averageRating: products.length > 0 ? totalRating / products.length : 0,
        topProducts: products
          .sort((a, b) => (b.wishlist_count || 0) - (a.wishlist_count || 0))
          .slice(0, 5),
        categoryStats: getCategoryStats(),
        recentActivity: getRealRecentActivity()
      };
    } else if (isSeller) {
      const sellerProducts = products.filter(p =>
        (p.seller_id === user.id || p.seller === user.id)
      );
      const totalRating = sellerProducts.reduce((sum, p) => sum + (p.rating || 0), 0);
      return {
        totalProducts: sellerProducts.length,
        totalWishlistItems: sellerProducts.reduce((sum, p) => sum + (p.wishlist_count || 0), 0),
        averageRating: sellerProducts.length > 0 ? totalRating / sellerProducts.length : 0,
        topProducts: sellerProducts
          .sort((a, b) => (b.wishlist_count || 0) - (a.wishlist_count || 0))
          .slice(0, 5),
        categoryPerformance: getSellerCategoryStats(sellerProducts)
      };
    }
  };

  // Category and Recent Activity helpers...
  const getCategoryStats = () => {
    const categories = {};
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = {
          count: 0,
          totalWishlist: 0,
          totalReviews: 0,
          avgRating: 0
        };
      }
      categories[category].count++;
      categories[category].totalWishlist += (product.wishlist_count || 0);
      categories[category].totalReviews += (product.reviews_count || 0);
      categories[category].avgRating += (product.rating || 0);
    });
    return Object.entries(categories).map(([category, stats]) => ({
      category,
      ...stats,
      avgRating: stats.count > 0 ? stats.avgRating / stats.count : 0
    })).sort((a, b) => b.totalWishlist - a.totalWishlist);
  };

  const getSellerCategoryStats = (sellerProducts) => {
    const categories = {};
    sellerProducts.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = {
          count: 0,
          wishlist: 0
        };
      }
      categories[category].count++;
      categories[category].wishlist += (product.wishlist_count || 0);
    });
    return Object.entries(categories).map(([category, stats]) => ({
      category,
      ...stats
    }));
  };

  const getRealRecentActivity = () => {
    const activities = [];
    const allReviews = JSON.parse(localStorage.getItem('all_reviews') || '[]');
    const recentReviews = allReviews.slice(-2);
    recentReviews.forEach(review => {
      const product = products.find(p => (p._id || p.id) === review.productId);
      if (product) {
        activities.push({
          id: `review_${review.id}`,
          type: 'review',
          message: `New review on ${product.name}`,
          time: getTimeAgo(review.timestamp)
        });
      }
    });

    const wishlistCount = realUsers.reduce((sum, user) => {
      const userWishlist = JSON.parse(localStorage.getItem(`wishlist_${user.id}`) || '[]');
      return sum + userWishlist.length;
    }, 0);
    if (wishlistCount > 0) {
      activities.push({
        id: 'wishlist_activity',
        type: 'wishlist',
        message: `${wishlistCount} products in wishlists`,
        time: '1 hour ago'
      });
    }
    activities.push({
      id: 'product_count',
      type: 'product',
      message: `${products.length} products available`,
      time: '2 hours ago'
    });
    activities.push({
      id: 'user_count',
      type: 'user',
      message: `${realUsers.length} registered users`,
      time: '3 hours ago'
    });
    return activities.slice(0, 4);
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const data = getAnalyticsData();
  if (!data) return null;

  // --- Render
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isAdmin ? 'System Analytics' : 'Seller Analytics'}
          </h1>
          <p className="text-gray-600">
            {isAdmin ? 'Overview of platform performance' : 'Track your product performance'}
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className={`grid grid-cols-1 ${isSeller ? 'md:grid-cols-2' : 'md:grid-cols-3'} lg:grid-cols-3 gap-6 mb-8`}>
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center space-x-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Products</h3>
              <p className="text-2xl font-bold text-blue-600">{data.totalProducts}</p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="bg-green-50 p-6 rounded-lg">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Users</h3>
                <p className="text-2xl font-bold text-green-600">{data.totalUsers}</p>
                <p className="text-sm text-gray-600">Registered users</p>
              </div>
            </div>
          </div>
        )}
        <div className="bg-purple-50 p-6 rounded-lg">
          <div className="flex items-center space-x-3">
            <Star className="h-8 w-8 text-purple-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Avg Rating</h3>
              <p className="text-2xl font-bold text-purple-600">
                {(data.averageRating || 0).toFixed(1)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 p-6 rounded-lg">
          <div className="flex items-center space-x-3">
            <Heart className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Wishlisted</h3>
              <p className="text-2xl font-bold text-red-600">{data.totalWishlistItems || 0}</p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="bg-yellow-50 p-6 rounded-lg">
            <div className="flex items-center space-x-3">
              <Star className="h-8 w-8 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
                <p className="text-2xl font-bold text-yellow-600">{data.totalReviews || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Top {isAdmin ? 'Products' : 'Performing Products'}
          </h2>
          <div className="space-y-4">
            {data.topProducts.map((product, index) => (
              <div key={product._id || product.id} className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.src = `https://via.placeholder.com/48x48/f0f0f0/666666?text=${encodeURIComponent(product.name?.charAt(0) || 'P')}`;
                  }}
                />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {product.wishlist_count || 0} wishlisted
                  </p>
                  <p className="text-sm text-gray-500">{(product.rating || 0).toFixed(1)} ★</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Category Performance
          </h2>
          <div className="space-y-4">
            {(isAdmin ? data.categoryStats : data.categoryPerformance).map((category) => (
              <div key={category.category} className="border-b border-gray-100 pb-4 last:border-b-0">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-900">
                    {category.category}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {category.count} products
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Wishlist</p>
                    <p className="font-medium">{isAdmin ? category.totalWishlist : category.wishlist}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{isAdmin ? 'Reviews' : 'Products'}</p>
                    <p className="font-medium">
                      {isAdmin ? category.totalReviews : category.count}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">{isAdmin ? 'Avg Rating' : ''}</p>
                    <p className="font-medium">
                      {isAdmin ? (category.avgRating || 0).toFixed(1) : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity (Admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {data.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={
                  `p-2 rounded-full ${
                    activity.type === 'review' ? 'bg-yellow-100 text-yellow-600'
                    : activity.type === 'wishlist' ? 'bg-red-100 text-red-600'
                    : activity.type === 'product' ? 'bg-blue-100 text-blue-600'
                    : 'bg-green-100 text-green-600'
                  }`
                }>
                  {activity.type === 'review' && <Star className="h-4 w-4" />}
                  {activity.type === 'wishlist' && <Heart className="h-4 w-4" />}
                  {activity.type === 'product' && <Package className="h-4 w-4" />}
                  {activity.type === 'user' && <Users className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;

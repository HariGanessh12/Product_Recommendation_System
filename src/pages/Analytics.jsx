import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { TrendingUp, Users, Star, Package, Heart, ShoppingCart, DollarSign } from 'lucide-react';

const Analytics = () => {
  const { user } = useAuth();
  const { products } = useProducts();
  const [timeRange, setTimeRange] = useState('30'); // days

  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'seller';

  // Calculate analytics data
  const getAnalyticsData = () => {
    if (isAdmin) {
      return {
        totalProducts: products.length,
        totalUsers: 150, // Mock data
        totalReviews: products.reduce((sum, p) => sum + p.reviews_count, 0),
        totalWishlistItems: products.reduce((sum, p) => sum + p.wishlist_count, 0),
        totalRevenue: 89450,
        averageRating: products.reduce((sum, p) => sum + p.rating, 0) / products.length,
        topProducts: products.sort((a, b) => b.wishlist_count - a.wishlist_count).slice(0, 5),
        categoryStats: getCategoryStats(),
        recentActivity: getRecentActivity()
      };
    } else if (isSeller) {
      const sellerProducts = products.filter(p => p.seller_id === user.id);
      return {
        totalProducts: sellerProducts.length,
        totalRevenue: sellerProducts.reduce((sum, p) => sum + (p.price * p.wishlist_count * 0.1), 0),
        totalViews: sellerProducts.reduce((sum, p) => sum + (p.wishlist_count * 10), 0),
        totalWishlistItems: sellerProducts.reduce((sum, p) => sum + p.wishlist_count, 0),
        averageRating: sellerProducts.length > 0 
          ? sellerProducts.reduce((sum, p) => sum + p.rating, 0) / sellerProducts.length 
          : 0,
        topProducts: sellerProducts.sort((a, b) => b.wishlist_count - a.wishlist_count).slice(0, 5),
        categoryPerformance: getSellerCategoryStats(sellerProducts)
      };
    }
  };

  const getCategoryStats = () => {
    const categories = {};
    products.forEach(product => {
      if (!categories[product.category]) {
        categories[product.category] = {
          count: 0,
          totalWishlist: 0,
          totalReviews: 0,
          avgRating: 0
        };
      }
      categories[product.category].count++;
      categories[product.category].totalWishlist += product.wishlist_count;
      categories[product.category].totalReviews += product.reviews_count;
      categories[product.category].avgRating += product.rating;
    });

    return Object.entries(categories).map(([category, stats]) => ({
      category,
      ...stats,
      avgRating: stats.avgRating / stats.count
    })).sort((a, b) => b.totalWishlist - a.totalWishlist);
  };

  const getSellerCategoryStats = (sellerProducts) => {
    const categories = {};
    sellerProducts.forEach(product => {
      if (!categories[product.category]) {
        categories[product.category] = {
          count: 0,
          revenue: 0,
          wishlist: 0
        };
      }
      categories[product.category].count++;
      categories[product.category].revenue += product.price * product.wishlist_count * 0.1;
      categories[product.category].wishlist += product.wishlist_count;
    });

    return Object.entries(categories).map(([category, stats]) => ({
      category,
      ...stats
    }));
  };

  const getRecentActivity = () => [
    { type: 'review', message: 'New review on Wireless Headphones', time: '2 hours ago' },
    { type: 'wishlist', message: 'Product added to 5 wishlists', time: '4 hours ago' },
    { type: 'product', message: 'New product listed: Smart Watch Pro', time: '6 hours ago' },
    { type: 'user', message: '3 new users registered', time: '8 hours ago' }
  ];

  const data = getAnalyticsData();

  if (!data) return null;

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              </div>
            </div>
          </div>
        )}

        <div className="bg-orange-50 p-6 rounded-lg">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-orange-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue</h3>
              <p className="text-2xl font-bold text-orange-600">
                ${data.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg">
          <div className="flex items-center space-x-3">
            <Star className="h-8 w-8 text-purple-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Avg Rating</h3>
              <p className="text-2xl font-bold text-purple-600">
                {data.averageRating.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {isSeller && (
          <>
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Views</h3>
                  <p className="text-2xl font-bold text-green-600">{data.totalViews}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <Heart className="h-8 w-8 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Wishlisted</h3>
                  <p className="text-2xl font-bold text-red-600">{data.totalWishlistItems}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {isAdmin && (
          <>
            <div className="bg-red-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <Heart className="h-8 w-8 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Wishlists</h3>
                  <p className="text-2xl font-bold text-red-600">{data.totalWishlistItems}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <Star className="h-8 w-8 text-yellow-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
                  <p className="text-2xl font-bold text-yellow-600">{data.totalReviews}</p>
                </div>
              </div>
            </div>
          </>
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
              <div key={product.id} className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {product.wishlist_count} wishlisted
                  </p>
                  <p className="text-sm text-gray-500">{product.rating.toFixed(1)} ★</p>
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
            {(isAdmin ? data.categoryStats : data.categoryPerformance).map((category, index) => (
              <div key={category.category} className="border-b border-gray-100 pb-4 last:border-b-0">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-900">
                    {category.category}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {isAdmin ? `${category.count} products` : `${category.count} products`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Wishlist</p>
                    <p className="font-medium">{isAdmin ? category.totalWishlist : category.wishlist}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">
                      {isAdmin ? 'Reviews' : 'Revenue'}
                    </p>
                    <p className="font-medium">
                      {isAdmin ? category.totalReviews : `$${category.revenue.toFixed(2)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">
                      {isAdmin ? 'Avg Rating' : 'Products'}
                    </p>
                    <p className="font-medium">
                      {isAdmin ? category.avgRating.toFixed(1) : category.count}
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
            {data.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${
                  activity.type === 'review' ? 'bg-yellow-100 text-yellow-600' :
                  activity.type === 'wishlist' ? 'bg-red-100 text-red-600' :
                  activity.type === 'product' ? 'bg-blue-100 text-blue-600' :
                  'bg-green-100 text-green-600'
                }`}>
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
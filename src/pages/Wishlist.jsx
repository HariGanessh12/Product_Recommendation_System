import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { useRecommendations } from '../contexts/RecommendationContext';
import ProductCard from '../components/ProductCard';
import { Heart, ShoppingBag } from 'lucide-react';

const Wishlist = () => {
  const { user } = useAuth();
  const { products } = useProducts();
  const { wishlist } = useRecommendations();

  // Fixed: Updated to work with simplified wishlist structure (array of product IDs)
  const wishlistProducts = wishlist
    .map(productId => {
      return products.find(p => (p._id || p.id) === productId);
    })
    .filter(Boolean); // Remove any undefined products

  if (wishlist.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
          <p className="text-gray-600">Save your favorite products for later</p>
        </div>

        <div className="text-center py-12">
          <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
          <p className="text-gray-600 mb-6">
            Start adding products to your wishlist by clicking the heart icon on any product.
          </p>
          <button
            onClick={() => window.location.href = '/products'} // Fixed: Better navigation
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 mx-auto"
          >
            <ShoppingBag className="h-5 w-5" />
            <span>Browse Products</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
        <p className="text-gray-600">
          You have {wishlist.length} item{wishlist.length !== 1 ? 's' : ''} in your wishlist
        </p>
      </div>

      {/* Wishlist Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistProducts.map(product => (
          <ProductCard key={product._id || product.id} product={product} />
        ))}
      </div>

      {/* Wishlist Stats */}
      <div className="mt-12 bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Wishlist Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{wishlist.length}</p>
            <p className="text-sm text-gray-600">Total Items</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              ${wishlistProducts.reduce((sum, product) => sum + (product?.price || 0), 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">Total Value</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">
              ${wishlistProducts.length > 0 
                ? (wishlistProducts.reduce((sum, product) => sum + (product?.price || 0), 0) / wishlistProducts.length).toFixed(2) 
                : '0.00'}
            </p>
            <p className="text-sm text-gray-600">Average Price</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wishlist;

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRecommendations } from '../contexts/RecommendationContext';
import { Heart, Star, ShoppingCart, Eye, ImageOff } from 'lucide-react';
import ProductModal from './ProductModal';

const ProductCard = ({ product }) => {
  const { isAuthenticated } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useRecommendations();
  const [showModal, setShowModal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleWishlistToggle = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) return;

    const productId = product.id || product._id;
    console.log('ProductCard - Product ID:', productId);
    console.log('ProductCard - Current wishlist status:', isInWishlist(productId));

    if (isInWishlist(productId)) {
      console.log('ProductCard - Removing from wishlist');
      removeFromWishlist(productId);
    } else {
      console.log('ProductCard - Adding to wishlist');
      addToWishlist(productId);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    console.log('Image failed to load:', product.image_url);
    setImageLoaded(true);
    setImageError(true);
  };

  const productId = product.id || product._id;
  const inWishlist = isAuthenticated && isInWishlist(productId);

  // Generate fallback placeholder image
  const generatePlaceholderUrl = (text) => {
    return `https://via.placeholder.com/500x320/f0f0f0/666666?text=${encodeURIComponent(text || 'No Image')}`;
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 group cursor-pointer">
        <div 
          className="relative overflow-hidden"
          onClick={() => setShowModal(true)}
        >
          <div className="aspect-w-4 aspect-h-3 bg-gray-200">
            {!imageError ? (
              <img
                src={product.image_url}
                alt={product.name}
                className={`w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            ) : (
              <img
                src={generatePlaceholderUrl(product.name)}
                alt={product.name}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 opacity-100"
                onLoad={handleImageLoad}
                onError={() => {
                  setImageLoaded(true);
                }}
              />
            )}
            
            {/* Loading Spinner */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Error State - if both original and placeholder fail */}
            {imageLoaded && imageError && !product.image_url && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                <ImageOff className="h-12 w-12 mb-2 text-gray-400" />
                <span className="text-sm">Image not available</span>
              </div>
            )}
          </div>
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Wishlist Button */}
          {isAuthenticated && (
            <button
              onClick={handleWishlistToggle}
              className={`absolute top-2 right-2 p-2 rounded-full transition-all duration-200 ${
                inWishlist
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-600 hover:text-red-500'
              } shadow-md hover:shadow-lg z-10`}
            >
              <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
            </button>
          )}

          {/* Category Badge */}
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full z-10">
            {product.category}
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {product.name}
          </h3>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium text-gray-700">
                {(product.rating || 0).toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">
                ({product.reviews_count || 0})
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {product.wishlist_count || 0} wishlisted
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-blue-600">
                ${product.price}
              </span>
              <span className="text-xs text-gray-500">
                by {product.seller_name}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>View</span>
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <ProductModal
          product={product}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default ProductCard;

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { useRecommendations } from '../contexts/RecommendationContext';
import { Star, Calendar, Package } from 'lucide-react';

const Reviews = () => {
  const { user } = useAuth();
  const { products } = useProducts();
  const { reviews, getAllReviews } = useRecommendations();
  const [viewMode, setViewMode] = useState('my-reviews'); // 'my-reviews' or 'all-reviews'

  const allReviews = JSON.parse(localStorage.getItem('all_reviews') || '[]');

  const getProductInfo = (productId) => {
    return products.find(p => p.id === productId);
  };

  const renderStars = (rating) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const myReviewsWithProducts = reviews.map(review => ({
    ...review,
    product: getProductInfo(review.productId)
  })).filter(review => review.product);

  const allReviewsWithProducts = allReviews.map(review => ({
    ...review,
    product: getProductInfo(review.productId)
  })).filter(review => review.product);

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reviews</h1>
        <p className="text-gray-600">
          {viewMode === 'my-reviews' ? 'Manage your product reviews' : 'Browse all product reviews'}
        </p>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-sm border mb-8">
        <div className="flex border-b">
          <button
            onClick={() => setViewMode('my-reviews')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              viewMode === 'my-reviews'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setViewMode('all-reviews')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              viewMode === 'all-reviews'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Reviews ({allReviews.length})
          </button>
        </div>
      </div>

      {viewMode === 'my-reviews' && (
        <>
          {/* My Reviews Stats */}
          {reviews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Star className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Total Reviews</h3>
                    <p className="text-2xl font-bold text-blue-600">{reviews.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Star className="h-8 w-8 text-green-600 fill-current" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Average Rating</h3>
                    <p className="text-2xl font-bold text-green-600">{averageRating}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Package className="h-8 w-8 text-orange-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Products Reviewed</h3>
                    <p className="text-2xl font-bold text-orange-600">{reviews.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* My Reviews List */}
          {myReviewsWithProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <Star className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No reviews yet</h3>
              <p className="text-gray-600">
                Start writing reviews for products you've purchased to help other buyers.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {myReviewsWithProducts.map((review) => (
                <div key={review.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-start space-x-4">
                    <img
                      src={review.product.image_url}
                      alt={review.product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {review.product.name}
                          </h3>
                          <p className="text-sm text-gray-600">{review.product.category}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {renderStars(review.rating)}
                          <span className="text-sm text-gray-500">
                            {new Date(review.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{review.reviewText}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Reviewed on {new Date(review.timestamp).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {viewMode === 'all-reviews' && (
        <div className="space-y-6">
          {allReviewsWithProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <Star className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No reviews available</h3>
              <p className="text-gray-600">Be the first to write a review!</p>
            </div>
          ) : (
            allReviewsWithProducts.map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start space-x-4">
                  <img
                    src={review.product.image_url}
                    alt={review.product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {review.product.name}
                        </h3>
                        <p className="text-sm text-gray-600">{review.product.category}</p>
                        <p className="text-sm text-blue-600 font-medium">
                          by {review.username}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-500">
                          {new Date(review.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700">{review.reviewText}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Reviews;
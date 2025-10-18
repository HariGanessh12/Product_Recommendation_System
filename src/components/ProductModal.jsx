import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRecommendations } from '../contexts/RecommendationContext';
import { useCart } from '../contexts/CartContext';
import { X, Heart, Star, ShoppingCart, MessageCircle, Plus, Minus, Trash2 } from 'lucide-react';

const ProductModal = ({ product, onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist, addReview, getUserReview, getAllReviews } = useRecommendations();
  const { addToCart, cartItems, updateQuantity, removeFromCart, isLoading: cartLoading } = useCart();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [cartMessage, setCartMessage] = useState('');

  const productId = product._id || product.id;
  const inWishlist = isAuthenticated && isInWishlist(productId);
  const userReview = isAuthenticated ? getUserReview(productId) : null;
  const allReviews = getAllReviews(productId);

  const cartItem = cartItems.find(item => item.id === productId);
  const isInCart = !!cartItem;
  const cartQuantity = cartItem ? cartItem.quantity : 0;

  const handleWishlistToggle = () => {
    if (!isAuthenticated) return;

    if (inWishlist) {
      removeFromWishlist(productId);
    } else {
      addToWishlist(productId);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      setCartMessage('Please sign in to add items to cart');
      setTimeout(() => setCartMessage(''), 3000);
      return;
    }

    if (user.role !== 'buyer' && user.role !== 'admin') {
      setCartMessage('Only buyers can add items to cart');
      setTimeout(() => setCartMessage(''), 3000);
      return;
    }

    if ((product.stock || 0) <= 0) {
      setCartMessage('This item is out of stock');
      setTimeout(() => setCartMessage(''), 3000);
      return;
    }

    setIsAdding(true);
    setCartMessage('Adding to cart...');

    try {
      const result = await addToCart(product, 1);
      
      if (result && result.success) {
        setCartMessage('Added to cart successfully');
        setTimeout(() => setCartMessage(''), 3000);
      } else {
        setCartMessage(`Error: ${result ? result.message : 'Unknown error'}`);
        setTimeout(() => setCartMessage(''), 5000);
      }
    } catch (error) {
      setCartMessage('Failed to add to cart');
      setTimeout(() => setCartMessage(''), 5000);
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuantityChange = async (newQuantity) => {
    try {
      let result;
      
      if (newQuantity <= 0) {
        result = await removeFromCart(productId);
      } else {
        result = await updateQuantity(productId, newQuantity);
      }
      
      if (!result.success) {
        setCartMessage(`Error: ${result.message}`);
        setTimeout(() => setCartMessage(''), 5000);
      }
    } catch (error) {
      setCartMessage('Failed to update cart');
      setTimeout(() => setCartMessage(''), 5000);
    }
  };

  const handleRemoveFromCart = async () => {
    try {
      const result = await removeFromCart(productId);
      
      if (!result.success) {
        setCartMessage(`Error: ${result.message}`);
        setTimeout(() => setCartMessage(''), 5000);
      }
    } catch (error) {
      setCartMessage('Failed to remove from cart');
      setTimeout(() => setCartMessage(''), 5000);
    }
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    const success = addReview(productId, rating, reviewText);
    if (success) {
      setShowReviewForm(false);
      setRating(5);
      setReviewText('');
    }
  };

  const canReview = isAuthenticated && user?.role === 'buyer' && !userReview;
  const outOfStock = (product.stock || 0) <= 0;
  const buttonDisabled = isAdding || cartLoading || !isAuthenticated || outOfStock;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-64 lg:h-96 object-cover rounded-lg"
                onError={(e) => {
                  e.target.src = `https://via.placeholder.com/400x300/f0f0f0/666666?text=${encodeURIComponent(product.name || 'Product')}`;
                }}
              />
            </div>

            <div>
              <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {product.category}
                </span>
              </div>

              <p className="text-gray-600 mb-6">
                {product.description}
              </p>

              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center space-x-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="font-medium">{(product.rating || 0).toFixed(1)}</span>
                  <span className="text-gray-500">({product.reviews_count || 0} reviews)</span>
                </div>
                <div className="text-gray-500">
                  {product.wishlist_count || 0} wishlisted
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl font-bold text-blue-600">
                    ${(product.price || 0).toFixed(2)}
                  </div>
                  <div className={`text-sm px-3 py-1 rounded-full font-medium ${
                    outOfStock
                      ? 'bg-red-100 text-red-800'
                      : (product.stock <= 5 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800')
                  }`}>
                    {outOfStock
                      ? 'Out of stock'
                      : `${product.stock} in stock`
                    }
                  </div>
                </div>
                <div className="text-gray-600">
                  Sold by <span className="font-medium">{product.seller_name}</span>
                </div>
              </div>

              {isAuthenticated && (
                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={handleWishlistToggle}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-medium transition-colors ${
                      inWishlist
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
                    <span>{inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}</span>
                  </button>

                  {!isInCart ? (
                    <button 
                      onClick={handleAddToCart}
                      disabled={buttonDisabled}
                      className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                        buttonDisabled
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isAdding || cartLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <ShoppingCart className="h-5 w-5" />
                      )}
                      <span>
                        {outOfStock 
                          ? 'Out of Stock'
                          : isAdding || cartLoading 
                            ? 'Adding...' 
                            : 'Add to Cart'
                        }
                      </span>
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center space-x-1 py-3 px-6 rounded-lg border border-gray-300 bg-gray-50">
                      <button
                        onClick={() => handleQuantityChange(cartQuantity - 1)}
                        disabled={cartLoading}
                        className="p-1 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <span className="mx-4 font-semibold text-lg min-w-[2rem] text-center">
                        {cartQuantity}
                      </span>
                      
                      <button
                        onClick={() => handleQuantityChange(cartQuantity + 1)}
                        disabled={cartLoading || cartQuantity >= (product.stock || 0)}
                        className="p-1 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      <button
                        onClick={handleRemoveFromCart}
                        disabled={cartLoading}
                        className="p-1 rounded-full hover:bg-red-100 text-red-600 transition-colors ml-2 disabled:opacity-50"
                        title="Remove from cart"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {cartMessage && (
                <div className={`text-sm p-3 rounded-lg mb-4 ${
                  cartMessage.includes('successfully') 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {cartMessage}
                </div>
              )}

              {!isAuthenticated && (
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800">Please sign in to add items to cart</p>
                </div>
              )}

              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Reviews</h3>
                  {canReview && (
                    <button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Write Review</span>
                    </button>
                  )}
                </div>

                {showReviewForm && (
                  <form onSubmit={handleSubmitReview} className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating
                      </label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className={`text-2xl hover:scale-110 transition-transform ${
                              star <= rating ? 'text-yellow-500' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Review
                      </label>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Share your experience with this product..."
                        required
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Submit Review
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {userReview && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium">Your Review</span>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= userReview.rating
                                ? 'text-yellow-500 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700">{userReview.reviewText}</p>
                  </div>
                )}

                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {allReviews.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No reviews yet</p>
                  ) : (
                    allReviews.map((review) => (
                      <div key={review.id} className="border-b pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{review.username}</span>
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={`${review.id}-${star}`}
                                  className={`h-4 w-4 ${
                                    star <= review.rating
                                      ? 'text-yellow-500 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(review.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700">{review.reviewText}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;

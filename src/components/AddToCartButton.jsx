import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart, Check } from 'lucide-react';

const AddToCartButton = ({ product, className = "", onAuthRequired }) => {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    addToCart(product);
    setIsAdded(true);
    
    // Reset the "added" state after 2 seconds
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  return (
    <button
      onClick={handleAddToCart}
      className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        isAdded 
          ? 'bg-green-600 text-white' 
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } ${className}`}
    >
      {isAdded ? (
        <>
          <Check className="h-4 w-4" />
          <span>Added!</span>
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          <span>Add to Cart</span>
        </>
      )}
    </button>
  );
};

export default AddToCartButton;

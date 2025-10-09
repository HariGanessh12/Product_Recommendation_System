import React from 'react';
import { useCart } from '../contexts/CartContext';
import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

const CartIcon = ({ className = "" }) => {
  const { getCartItemsCount } = useCart();
  const itemCount = getCartItemsCount();

  return (
    <Link to="/cart" className={`relative ${className}`}>
      <ShoppingCart className="h-6 w-6 text-gray-600 hover:text-blue-600" />
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
};

export default CartIcon;

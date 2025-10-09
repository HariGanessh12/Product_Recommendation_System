import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // API Base URL
  const API_BASE_URL = 'http://localhost:5000';

  // Load cart from API when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      loadCartFromAPI();
    } else {
      setCartItems([]);
    }
  }, [isAuthenticated]);

  const loadCartFromAPI = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCartItems(data.cartItems || []);
      } else {
        console.error('Failed to load cart:', response.status);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (product, quantity = 1) => {
    if (!isAuthenticated) return false;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/cart/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: quantity
        })
      });

      if (response.ok) {
        await loadCartFromAPI(); // Reload cart
        return true;
      } else {
        console.error('Failed to add to cart:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    if (!isAuthenticated) return false;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/cart/remove`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: productId
        })
      });

      if (response.ok) {
        await loadCartFromAPI(); // Reload cart
        return true;
      } else {
        console.error('Failed to remove from cart:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (!isAuthenticated) return false;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/cart/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: quantity
        })
      });

      if (response.ok) {
        await loadCartFromAPI(); // Reload cart
        return true;
      } else {
        console.error('Failed to update cart:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Failed to update cart:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated) return false;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setCartItems([]);
        return true;
      } else {
        console.error('Failed to clear cart:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Failed to clear cart:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemsCount,
    isLoading,
    loadCartFromAPI
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

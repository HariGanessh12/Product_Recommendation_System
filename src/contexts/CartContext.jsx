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
  const { isAuthenticated, user, getAuthToken } = useAuth();

  // API Base URL
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api').replace(/\/$/, '');

  // Get the correct token key
  const getToken = () => {
    return localStorage.getItem('authToken') || getAuthToken();
  };

  // Load cart from API when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('CartContext: Loading cart for user:', user.id);
      loadCartFromAPI();
    } else {
      setCartItems([]);
    }
  }, [isAuthenticated, user]);

  const loadCartFromAPI = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const token = getToken();
      
      console.log('CartContext: Loading cart with token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        console.error('CartContext: No auth token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('CartContext: Load cart response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('CartContext: Loaded cart items:', data.cartItems?.length || 0);
        setCartItems(data.cartItems || []);
      } else {
        const errorData = await response.text();
        console.error('CartContext: Failed to load cart:', response.status, errorData);
        if (response.status === 401) {
          setCartItems([]);
        }
      }
    } catch (error) {
      console.error('CartContext: Failed to load cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (product, quantity = 1) => {
    if (!isAuthenticated || !user) {
      console.log('CartContext: User not authenticated');
      return { success: false, message: 'Please login to add items to cart' };
    }

    try {
      setIsLoading(true);
      const token = getToken();
      
      console.log('CartContext: Adding to cart - Product:', product.id || product._id, 'Quantity:', quantity);
      console.log('CartContext: Using token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        console.error('CartContext: No auth token found');
        return { success: false, message: 'Authentication token missing' };
      }

      const response = await fetch(`${API_BASE_URL}/cart/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: product.id || product._id,
          quantity: quantity
        })
      });

      console.log('CartContext: Add to cart response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('CartContext: Add to cart success:', data);
        await loadCartFromAPI();
        
        // NEW: Dispatch cart updated event for recommendations
        window.dispatchEvent(new CustomEvent('cart-updated', { 
          detail: { 
            action: 'add', 
            productId: product.id || product._id,
            quantity: quantity
          }
        }));
        
        return { success: true, message: 'Item added to cart successfully' };
      } else {
        const errorData = await response.text();
        console.error('CartContext: Failed to add to cart:', response.status, errorData);
        
        let errorMessage = 'Failed to add item to cart';
        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          // Keep default error message
        }
        
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error('CartContext: Failed to add to cart:', error);
      return { success: false, message: 'Network error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    if (!isAuthenticated) return { success: false, message: 'Not authenticated' };

    try {
      setIsLoading(true);
      const token = getToken();
      
      if (!token) {
        return { success: false, message: 'Authentication token missing' };
      }

      const response = await fetch(`${API_BASE_URL}/cart/remove`, {
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
        await loadCartFromAPI();
        
        // NEW: Dispatch cart updated event for recommendations
        window.dispatchEvent(new CustomEvent('cart-updated', { 
          detail: { 
            action: 'remove', 
            productId: productId
          }
        }));
        
        return { success: true, message: 'Item removed from cart' };
      } else {
        const errorData = await response.text();
        console.error('CartContext: Failed to remove from cart:', response.status, errorData);
        return { success: false, message: 'Failed to remove item from cart' };
      }
    } catch (error) {
      console.error('CartContext: Failed to remove from cart:', error);
      return { success: false, message: 'Network error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (!isAuthenticated) return { success: false, message: 'Not authenticated' };

    try {
      setIsLoading(true);
      const token = getToken();
      
      if (!token) {
        return { success: false, message: 'Authentication token missing' };
      }

      const response = await fetch(`${API_BASE_URL}/cart/update`, {
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
        await loadCartFromAPI();
        
        // NEW: Dispatch cart updated event for recommendations
        window.dispatchEvent(new CustomEvent('cart-updated', { 
          detail: { 
            action: 'update', 
            productId: productId,
            quantity: quantity
          }
        }));
        
        return { success: true, message: 'Cart updated successfully' };
      } else {
        const errorData = await response.text();
        console.error('CartContext: Failed to update cart:', response.status, errorData);
        return { success: false, message: 'Failed to update cart' };
      }
    } catch (error) {
      console.error('CartContext: Failed to update cart:', error);
      return { success: false, message: 'Network error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated) return { success: false, message: 'Not authenticated' };

    try {
      setIsLoading(true);
      const token = getToken();
      
      if (!token) {
        return { success: false, message: 'Authentication token missing' };
      }

      const response = await fetch(`${API_BASE_URL}/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setCartItems([]);
        
        // NEW: Dispatch cart updated event for recommendations
        window.dispatchEvent(new CustomEvent('cart-updated', { 
          detail: { 
            action: 'clear'
          }
        }));
        
        return { success: true, message: 'Cart cleared successfully' };
      } else {
        const errorData = await response.text();
        console.error('CartContext: Failed to clear cart:', response.status, errorData);
        return { success: false, message: 'Failed to clear cart' };
      }
    } catch (error) {
      console.error('CartContext: Failed to clear cart:', error);
      return { success: false, message: 'Network error occurred' };
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

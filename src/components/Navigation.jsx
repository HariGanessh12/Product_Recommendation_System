import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { ShoppingBag, Heart, Star, BarChart3, Users, Package, LogOut, User, Menu, ShoppingCart } from 'lucide-react';

const Navigation = ({ currentPage, setCurrentPage, onAuthClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  
  // Safe cart hook usage with fallback
  let getCartItemsCount = () => 0;
  try {
    const cartContext = useCart();
    getCartItemsCount = cartContext.getCartItemsCount;
  } catch (error) {
    console.log('Cart context not available, using fallback');
  }

  const getBuyerMenuItems = () => [
    { id: 'dashboard', label: 'Home', icon: ShoppingBag },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'cart', label: 'Cart', icon: ShoppingCart },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'reviews', label: 'Reviews', icon: Star }
  ];

  const getSellerMenuItems = () => [
    { id: 'dashboard', label: 'Home', icon: ShoppingBag },
    { id: 'seller-products', label: 'My Products', icon: Package },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const getAdminMenuItems = () => [
    { id: 'dashboard', label: 'Dashboard', icon: ShoppingBag },
    { id: 'products', label: 'All Products', icon: Package },
    { id: 'cart', label: 'Cart', icon: ShoppingCart },
    { id: 'user-management', label: 'Users', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const getMenuItems = () => {
    if (!isAuthenticated) return [{ id: 'dashboard', label: 'Home', icon: ShoppingBag }];
    
    switch (user?.role) {
      case 'buyer': return getBuyerMenuItems();
      case 'seller': return getSellerMenuItems();
      case 'admin': return getAdminMenuItems();
      default: return [{ id: 'dashboard', label: 'Home', icon: ShoppingBag }];
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentPage('dashboard');
  };

  // Show cart badge for buyers and admins
  const showCartBadge = isAuthenticated && (user?.role === 'buyer' || user?.role === 'admin');
  const cartItemsCount = getCartItemsCount();

  const menuItems = getMenuItems();

  return (
    <nav className="bg-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-blue-600">ProductHub</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isCartItem = item.id === 'cart';
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`relative px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700">{user?.username}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onAuthClick}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-gray-600 hover:text-gray-900">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-t">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isCartItem = item.id === 'cart';
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`relative w-full text-left px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

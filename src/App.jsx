import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ProductProvider } from './contexts/ProductContext';
import { RecommendationProvider } from './contexts/RecommendationContext';
import Navigation from './components/Navigation';
import AuthModal from './components/AuthModal';
import AIAssistant from './components/AIAssistant';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Wishlist from './pages/Wishlist';
import Reviews from './pages/Reviews';
import Analytics from './pages/Analytics';
import UserManagement from './pages/UserManagement';
import SellerProducts from './pages/SellerProducts';
import { useAuth } from './contexts/AuthContext';

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const renderPage = () => {
    if (!isAuthenticated) {
      return <Dashboard onAuthRequired={() => setShowAuthModal(true)} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'wishlist':
        return user?.role === 'buyer' ? <Wishlist /> : <Dashboard />;
      case 'reviews':
        return <Reviews />;
      case 'seller-products':
        return user?.role === 'seller' ? <SellerProducts /> : <Dashboard />;
      case 'analytics':
        return ['seller', 'admin'].includes(user?.role) ? <Analytics /> : <Dashboard />;
      case 'user-management':
        return user?.role === 'admin' ? <UserManagement /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        onAuthClick={() => setShowAuthModal(true)}
      />
      
      <main className="pt-16">
        {renderPage()}
      </main>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      <AIAssistant />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <RecommendationProvider>
          <AppContent />
        </RecommendationProvider>
      </ProductProvider>
    </AuthProvider>
  );
}

export default App;
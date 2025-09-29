import React, { createContext, useContext, useState, useEffect } from 'react';

const ProductContext = createContext();

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

const mockProducts = [
  {
    id: '1',
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium quality wireless headphones with noise cancellation and 30-hour battery life.',
    category: 'Electronics',
    price: 199.99,
    seller_id: '2',
    seller_name: 'Jane Seller',
    image_url: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=500',
    rating: 4.5,
    reviews_count: 128,
    wishlist_count: 45
  },
  {
    id: '2',
    name: 'Smart Fitness Watch',
    description: 'Track your fitness goals with this advanced smartwatch featuring heart rate monitoring and GPS.',
    category: 'Electronics',
    price: 299.99,
    seller_id: '2',
    seller_name: 'Jane Seller',
    image_url: 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=500',
    rating: 4.8,
    reviews_count: 89,
    wishlist_count: 67
  },
  {
    id: '3',
    name: 'Professional Camera Lens',
    description: '85mm f/1.4 lens perfect for portrait photography with beautiful bokeh effects.',
    category: 'Photography',
    price: 1299.99,
    seller_id: '2',
    seller_name: 'Jane Seller',
    image_url: 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=500',
    rating: 4.9,
    reviews_count: 34,
    wishlist_count: 23
  },
  {
    id: '4',
    name: 'Ergonomic Office Chair',
    description: 'Comfortable office chair with lumbar support and adjustable height for long work sessions.',
    category: 'Furniture',
    price: 449.99,
    seller_id: '2',
    seller_name: 'Jane Seller',
    image_url: 'https://images.pexels.com/photos/586750/pexels-photo-586750.jpeg?auto=compress&cs=tinysrgb&w=500',
    rating: 4.3,
    reviews_count: 156,
    wishlist_count: 78
  },
  {
    id: '5',
    name: 'Organic Coffee Beans',
    description: 'Premium organic coffee beans from sustainable farms with rich, full-bodied flavor.',
    category: 'Food & Beverages',
    price: 24.99,
    seller_id: '2',
    seller_name: 'Jane Seller',
    image_url: 'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=500',
    rating: 4.6,
    reviews_count: 203,
    wishlist_count: 92
  },
  {
    id: '6',
    name: 'Yoga Mat Premium',
    description: 'Non-slip yoga mat with extra cushioning for comfortable practice sessions.',
    category: 'Sports & Fitness',
    price: 79.99,
    seller_id: '2',
    seller_name: 'Jane Seller',
    image_url: 'https://images.pexels.com/photos/3822621/pexels-photo-3822621.jpeg?auto=compress&cs=tinysrgb&w=500',
    rating: 4.4,
    reviews_count: 67,
    wishlist_count: 34
  }
];

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState(mockProducts);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    setCategories(uniqueCategories);
  }, [products]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    
    return matchesSearch && matchesCategory && matchesPrice;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'popularity':
        return b.wishlist_count - a.wishlist_count;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const addProduct = (productData) => {
    const newProduct = {
      ...productData,
      id: Date.now().toString(),
      rating: 0,
      reviews_count: 0,
      wishlist_count: 0
    };
    setProducts(prev => [...prev, newProduct]);
    return newProduct;
  };

  const updateProduct = (productId, updates) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, ...updates } : p
    ));
  };

  const deleteProduct = (productId) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const getProductById = (id) => {
    return products.find(p => p.id === id);
  };

  const value = {
    products,
    categories,
    filteredProducts,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    sortBy,
    setSortBy,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};
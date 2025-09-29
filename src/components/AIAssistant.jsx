import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

const AIAssistant = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: `Hi! I'm your AI shopping assistant. I can help you find products, explain recommendations, and guide you through the platform. How can I help you today?`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse = generateBotResponse(inputMessage);
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateBotResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('recommend') || input.includes('suggestion')) {
      return `Based on your ${isAuthenticated ? 'profile and wishlist' : 'browsing'}, I'd recommend checking out our Electronics and Photography categories. Our Wireless Bluetooth Headphones and Smart Fitness Watch are very popular right now. Would you like me to show you similar products?`;
    }
    
    if (input.includes('wishlist')) {
      return isAuthenticated 
        ? `Your wishlist helps me understand your preferences better. Products you add to your wishlist influence my recommendations. I can also notify you about price drops or similar items. Would you like tips on finding products you might love?`
        : `You'll need to sign in to use the wishlist feature. Once you do, I can provide personalized recommendations based on your saved items. Would you like me to explain how our recommendation system works?`;
    }
    
    if (input.includes('price') || input.includes('cost')) {
      return `I can help you find products within your budget! Our filters allow you to set price ranges, and I can notify you about sales and discounts. What's your budget range for the type of product you're looking for?`;
    }
    
    if (input.includes('review') || input.includes('rating')) {
      return `Reviews are crucial for making good purchasing decisions! I analyze review patterns to help recommend products. Look for items with 4+ star ratings and multiple reviews. Would you like me to explain how to write helpful reviews?`;
    }
    
    if (input.includes('seller') || input.includes('store')) {
      if (user?.role === 'seller') {
        return `As a seller, I can help you optimize your product listings, understand analytics, and improve your sales. Focus on high-quality photos, detailed descriptions, and competitive pricing. Need tips on any specific aspect?`;
      }
      return `I can help you find reputable sellers and understand seller ratings. Look for sellers with good feedback and prompt shipping. Would you like me to explain what to look for in a trustworthy seller?`;
    }
    
    if (input.includes('help') || input.includes('how')) {
      const role = user?.role || 'visitor';
      const roleHelp = {
        buyer: `As a buyer, you can browse products, add items to your wishlist, write reviews, and get personalized recommendations. I'm here to help you find exactly what you're looking for!`,
        seller: `As a seller, you can manage your products, view analytics, and track customer engagement. I can help you optimize your listings and understand your sales data.`,
        admin: `As an admin, you have access to user management, system analytics, and all platform features. I can help you navigate the admin dashboard and understand system metrics.`,
        visitor: `Welcome! You can browse our product catalog, but you'll need to create an account to access wishlist, reviews, and personalized recommendations. Would you like me to explain the benefits of each account type?`
      };
      return roleHelp[role];
    }
    
    // Default responses
    const responses = [
      `I'd be happy to help you with that! Could you provide more specific details about what you're looking for?`,
      `That's a great question! I can help you find the best products and deals. What category are you most interested in?`,
      `I'm here to make your shopping experience better. Whether you need product recommendations, help with features, or shopping tips, just let me know!`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white rounded-lg shadow-xl border z-40">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <span className="font-medium">AI Shopping Assistant</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-2 ${
              message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className={`p-2 rounded-full ${
              message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {message.type === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            <div className={`max-w-[70%] p-3 rounded-lg ${
              message.type === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-gray-100 text-gray-800 rounded-bl-none'
            }`}>
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-start space-x-2">
            <div className="p-2 rounded-full bg-gray-200 text-gray-700">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-gray-100 text-gray-800 p-3 rounded-lg rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isTyping}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIAssistant;
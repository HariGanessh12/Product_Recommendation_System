import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Search, Filter, Ban, CheckCircle, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

const UserManagement = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API base URL - adjust this to match your backend
  const API_BASE_URL = 'http://localhost:5000/api';

  const fetchUsersFromMongoDB = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching users from MongoDB...');
      
      // DEBUG: Check what's available
      console.log('🔍 Debug Info:');
      console.log('- localStorage token:', localStorage.getItem('token'));
      console.log('- AuthContext user:', user);
      console.log('- All localStorage keys:', Object.keys(localStorage));
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('authToken') || localStorage.getItem('token') || user?.token;
      
      if (!token) {
        console.log('No token found - user needs to log in');
        throw new Error('No authentication token found. Please log in.');
      }
      
      console.log('Token found, making API call...');
      
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in as an admin.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('=== API Response Debug ===');
      console.log('Full response:', data);
      console.log('data.success:', data.success);
      console.log('data.users:', data.users);
      console.log('data.users type:', typeof data.users);
      console.log('data.users length:', data.users?.length);
      if (data.users && data.users.length > 0) {
        console.log('First user:', data.users[0]);
      }
      console.log('=== End Debug ===');

      if (data.success) {
        console.log(`Successfully loaded ${data.count} users`);
        setUsers(data.users);
      } else {
        throw new Error(data.error || 'Failed to fetch users');
      }
      
    } catch (error) {
      console.error('Error:', error);
      setError(`Failed to load users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsersFromMongoDB();
  }, []);

  // Update user status in MongoDB
const handleToggleUserStatus = async (userId) => {
  const userToUpdate = users.find(u => u.id === userId || u._id === userId);
  if (!userToUpdate) return;

  const newStatus = userToUpdate.status === 'active' ? 'banned' : 'active';
  
  try {
    console.log(`🔄 Updating user ${userToUpdate.username} status to ${newStatus}...`);
    
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || user?.token;
    
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {  // ← Added /auth
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // ← Added JWT token
      },
      body: JSON.stringify({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('User status updated successfully');
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          (u.id === userId || u._id === userId)
            ? { ...u, status: newStatus }
            : u
        )
      );
    } else {
      throw new Error(data.error || 'Failed to update user');
    }
    
  } catch (error) {
    console.error('Error updating user:', error);
    alert(`Failed to update user: ${error.message}`);
  }
};

// Delete user from MongoDB
const handleDeleteUser = async (userId) => {
  // Prevent admin from deleting themselves
  if (userId === user?.id || userId === user?._id) {
    alert('You cannot delete your own account!');
    return;
  }

  const userToDelete = users.find(u => u.id === userId || u._id === userId);
  if (!userToDelete) return;

  if (!window.confirm(`Are you sure you want to delete ${userToDelete.username}? This action cannot be undone.`)) {
    return;
  }

  try {
    console.log(`Deleting user ${userToDelete.username}...`);
    
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || user?.token;
    
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {  // ← Added /auth
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // ← Added JWT token
      }
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('User deleted successfully');
      // Remove from local state
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId && u._id !== userId));
    } else {
      throw new Error(data.error || 'Failed to delete user');
    }
    
  } catch (error) {
    console.error('Error deleting user:', error);
    alert(`Failed to delete user: ${error.message}`);
  }
};

  // Filter users based on search and filters
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate stats
  const getUserStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const bannedUsers = users.filter(u => u.status === 'banned').length;
    const buyers = users.filter(u => u.role === 'buyer').length;
    const sellers = users.filter(u => u.role === 'seller').length;
    const admins = users.filter(u => u.role === 'admin').length;

    return { totalUsers, activeUsers, bannedUsers, buyers, sellers, admins };
  };

  const stats = getUserStats();

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Loading Users from MongoDB...</h3>
          <p className="text-gray-600">Fetching user data from database...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Failed to Load Users</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchUsersFromMongoDB}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          </div>
          
          <button
            onClick={fetchUsersFromMongoDB}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Users</span>
          </button>
        </div>
      </div>


      {/* Enhanced Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Total</h3>
              <p className="text-xl font-bold text-blue-600">{stats.totalUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Active</h3>
              <p className="text-xl font-bold text-green-600">{stats.activeUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Ban className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Banned</h3>
              <p className="text-xl font-bold text-red-600">{stats.bannedUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-purple-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Buyers</h3>
              <p className="text-xl font-bold text-purple-600">{stats.buyers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-orange-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Sellers</h3>
              <p className="text-xl font-bold text-orange-600">{stats.sellers}</p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-indigo-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Admins</h3>
              <p className="text-xl font-bold text-indigo-600">{stats.admins}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search by name or email..."
              />
            </div>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                id="role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Roles</option>
                <option value="buyer">Buyers ({stats.buyers})</option>
                <option value="seller">Sellers ({stats.sellers})</option>
                <option value="admin">Admins ({stats.admins})</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active ({stats.activeUsers})</option>
                <option value="banned">Banned ({stats.bannedUsers})</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-6 flex justify-between items-center">
        <p className="text-gray-600">
          Showing {filteredUsers.length} users from MongoDB
          {searchQuery && ` matching "${searchQuery}"`}
          {roleFilter !== 'all' && ` with role "${roleFilter}"`}
          {statusFilter !== 'all' && ` with status "${statusFilter}"`}
        </p>
        
        {filteredUsers.length > 0 && (
          <div className="text-sm text-gray-500">
            Distribution: {filteredUsers.filter(u => u.role === 'buyer').length}B / {filteredUsers.filter(u => u.role === 'seller').length}S / {filteredUsers.filter(u => u.role === 'admin').length}A
          </div>
        )}
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600">
            {users.length === 0 
              ? "No users found in MongoDB database." 
              : "Try adjusting your search criteria or filters."
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((userData) => (
                  <tr key={userData._id || userData.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {userData.username}
                          {userData.email === user?.email && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {userData.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        userData.role === 'admin' ? 'bg-red-100 text-red-800' :
                        userData.role === 'seller' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {userData.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        (userData.status || 'active') === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {userData.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userData.created_at ? new Date(userData.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {userData.email !== user?.email && (
                          <>
                            <button
                              onClick={() => handleToggleUserStatus(userData.id || userData._id)}
                              className={`${
                                userData.status === 'active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                              } transition-colors`}
                              title={userData.status === 'active' ? 'Ban User' : 'Unban User'}
                            >
                              {userData.status === 'active' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(userData.id || userData._id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {userData.email === user?.email && (
                          <span className="text-xs text-gray-500">Current User</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

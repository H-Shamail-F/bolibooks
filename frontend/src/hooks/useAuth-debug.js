import { useState, useEffect, useContext, createContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔄 Initializing authentication...');
      const token = localStorage.getItem('authToken');
      console.log('🔑 Token from storage:', token ? 'Found' : 'Not found');
      
      if (token) {
        try {
          console.log('🌐 Calling /me API...');
          const response = await api.getMe();
          console.log('✅ Me API response:', response.data);
          setUser(response.data.user);
        } catch (error) {
          console.error('❌ Failed to initialize auth:', error);
          console.error('Error details:', error.response?.data);
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
      console.log('🏁 Auth initialization complete');
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    console.log('🔄 Attempting login with:', credentials.email);
    try {
      const response = await api.login(credentials);
      console.log('✅ Login API response:', response.data);
      const { token, user } = response.data;
      
      localStorage.setItem('authToken', token);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      console.error('❌ Login failed:', error);
      console.error('Error details:', error.response?.data);
      const message = error.response?.data?.error || 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    console.log('🔄 Attempting registration for:', userData.email);
    try {
      const response = await api.register(userData);
      console.log('✅ Registration API response:', response.data);
      const { token, user } = response.data;
      
      localStorage.setItem('authToken', token);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      console.error('Error details:', error.response?.data);
      const message = error.response?.data?.error || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    console.log('🔄 Logging out...');
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
      console.log('✅ Logout complete');
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  console.log('🔍 Auth state:', { 
    user: user ? user.email : 'none', 
    loading, 
    isAuthenticated: !!user 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
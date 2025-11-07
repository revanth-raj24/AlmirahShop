import { createContext, useContext, useState, useEffect } from 'react';
import API from '../lib/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Check if user is seller
        try {
          await API.get('/seller/products');
          localStorage.setItem('userRole', 'seller');
          setUser(prev => ({ ...prev, role: 'seller' }));
          return;
        } catch (sellerErr) {
          // Not a seller - clear token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          localStorage.removeItem('userRole');
          setUser(null);
        }
      }
    } catch (err) {
      // Silent fail, clear user
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      setUser(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const userRole = localStorage.getItem('userRole');
    if (token && username && userRole === 'seller') {
      setUser({ username, role: 'seller' });
      // Verify seller access
      if (token) {
        fetchUserProfile();
      }
    } else {
      // Clear if not seller
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      setUser(null);
    }
    setLoading(false);
  }, []);

  const signUpSeller = async ({ username, email, password, phone }) => {
    const payload = { username, email, password, phone };
    const { data } = await API.post('/users/register-seller', payload);
    return data;
  };

  const verifyOTP = async (email, otp) => {
    const { data } = await API.post('/verify-otp', { email, otp });
    return data;
  };

  const signIn = async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const { data } = await API.post('/users/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('username', data.username || username);
    
    // Verify seller access
    try {
      await API.get('/seller/products');
      const userRole = 'seller';
      localStorage.setItem('userRole', userRole);
      setUser({ username: data.username || username, role: userRole });
      return { ...data, role: userRole };
    } catch {
      // Not a seller - clear and throw error
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      throw new Error('Access denied. Seller credentials required.');
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    setUser(null);
  };

  const value = {
    user,
    loading,
    signUpSeller,
    signIn,
    signOut,
    verifyOTP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


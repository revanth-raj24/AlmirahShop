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
        // Check if user is admin
        try {
          await API.get('/admin/sellers');
          localStorage.setItem('userRole', 'admin');
          setUser(prev => ({ ...prev, role: 'admin' }));
          return;
        } catch (adminErr) {
          // Not an admin - clear token and redirect to login
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
    if (token && username && userRole === 'admin') {
      setUser({ username, role: 'admin' });
      // Verify admin access
      if (token) {
        fetchUserProfile();
      }
    } else {
      // Clear if not admin
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      setUser(null);
    }
    setLoading(false);
  }, []);

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
    
    // Check if user is admin from login response
    if (data.role !== 'admin') {
      // Not an admin - clear and throw error
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      throw new Error('Access denied. Admin credentials required.');
    }
    
    // User is admin - set up session
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('username', data.username || username);
    localStorage.setItem('userRole', 'admin');
    setUser({ username: data.username || username, role: 'admin' });
    return { ...data, role: 'admin' };
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
    signIn,
    signOut,
    verifyOTP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


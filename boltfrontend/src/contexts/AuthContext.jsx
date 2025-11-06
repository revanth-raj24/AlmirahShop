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
        // Try to access admin endpoint first (super admin check)
        try {
          await API.get('/admin/sellers');
          localStorage.setItem('userRole', 'admin');
          setUser(prev => ({ ...prev, role: 'admin' }));
          return;
        } catch (adminErr) {
          // Not an admin, check if seller
          try {
            await API.get('/seller/products');
            localStorage.setItem('userRole', 'seller');
            setUser(prev => ({ ...prev, role: 'seller' }));
            return;
          } catch (sellerErr) {
            // Not a seller, default to customer
            localStorage.setItem('userRole', 'customer');
            setUser(prev => ({ ...prev, role: 'customer' }));
          }
        }
      }
    } catch (err) {
      // Silent fail, default to customer
      localStorage.setItem('userRole', 'customer');
      setUser(prev => ({ ...prev, role: 'customer' }));
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const userRole = localStorage.getItem('userRole');
    if (token && username) {
      setUser({ username, role: userRole || 'customer' });
      // Fetch user profile to get role
      if (token) {
        fetchUserProfile();
      }
    }
    setLoading(false);
  }, []);

  const signUp = async ({ username, email, password, phone }) => {
    const payload = { username, email, password, phone };
    const { data } = await API.post('/users/signup', payload);
    return data;
  };

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
    
    // Use role from response if available, otherwise check via API
    let userRole = data.role || 'customer';
    if (!data.role) {
      try {
        // Check admin first (super admin)
        await API.get('/admin/sellers');
        userRole = 'admin';
      } catch {
        try {
          // Check seller
          await API.get('/seller/products');
          userRole = 'seller';
        } catch {
          userRole = 'customer';
        }
      }
    }
    
    localStorage.setItem('userRole', userRole);
    setUser({ username: data.username || username, role: userRole });
    return { ...data, role: userRole };
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
    signUp,
    signUpSeller,
    signIn,
    signOut,
    verifyOTP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

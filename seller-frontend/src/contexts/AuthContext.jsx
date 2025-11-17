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
  const [sellerStatusChecked, setSellerStatusChecked] = useState(false);

  const fetchSellerStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setSellerStatusChecked(true);
        return;
      }

      const { data } = await API.get('/seller/status');
      localStorage.setItem('userRole', 'seller');
      localStorage.setItem('isApproved', String(data.is_approved));
      localStorage.setItem('username', data.username);

      setUser({
        username: data.username,
        role: 'seller',
        isApproved: data.is_approved,
        email: data.email,
        sellerId: data.seller_id,
      });
    } catch (err) {
      // If token is invalid or user is not seller, clear auth
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      localStorage.removeItem('isApproved');
      setUser(null);
    } finally {
      setSellerStatusChecked(true);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    if (token && userRole === 'seller') {
      fetchSellerStatus().finally(() => setLoading(false));
    } else {
      // Clear if not seller
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      localStorage.removeItem('isApproved');
      setUser(null);
      setLoading(false);
      setSellerStatusChecked(true);
    }
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

    // Determine role from response; only proceed for sellers in this frontend
    if (data.role !== 'seller') {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      localStorage.removeItem('isApproved');
      throw new Error('Access denied. Seller credentials required.');
    }

    localStorage.setItem('userRole', 'seller');
    if (typeof data.is_approved === 'boolean') {
      localStorage.setItem('isApproved', String(data.is_approved));
    }

    const userData = {
      username: data.username || username,
      role: 'seller',
      isApproved: !!data.is_approved,
    };

    setUser(userData);
    return userData;
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isApproved');
    setUser(null);
  };

  const value = {
    user,
    loading,
    sellerStatusChecked,
    signUpSeller,
    signIn,
    signOut,
    verifyOTP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


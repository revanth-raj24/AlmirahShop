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
        // Check if admin - if so, clear token (admin should use admin portal)
        try {
          await API.get('/admin/sellers');
          // Admin detected - clear token and don't set user
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          localStorage.removeItem('userRole');
          setUser(null);
          return;
        } catch (adminErr) {
          // 403 is expected for non-admin users - ignore it
          // Only handle non-403 errors (like 401 which means invalid token)
          if (adminErr?.response?.status !== 403 && adminErr?.response?.status !== 404) {
            // If it's not a 403/404, might be auth issue - clear token
            if (adminErr?.response?.status === 401) {
              localStorage.removeItem('token');
              localStorage.removeItem('username');
              localStorage.removeItem('userRole');
              setUser(null);
              return;
            }
          }
          
          // Not an admin, check if seller - if so, clear token (seller should use seller portal)
          try {
            await API.get('/seller/products');
            // Seller detected - clear token and don't set user
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('userRole');
            setUser(null);
            return;
          } catch (sellerErr) {
            // 403 is expected for non-seller users - ignore it
            // Only handle non-403 errors
            if (sellerErr?.response?.status !== 403 && sellerErr?.response?.status !== 404) {
              // If it's not a 403/404, might be auth issue - clear token
              if (sellerErr?.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                localStorage.removeItem('userRole');
                setUser(null);
                return;
              }
            }
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
    
    // If admin or seller role detected, clear it (they should use their dedicated portals)
    if (userRole === 'admin' || userRole === 'seller') {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      setUser(null);
      setLoading(false);
      return;
    }
    
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
        // Check admin first (super admin) - if admin, don't allow login in main app
        await API.get('/admin/sellers');
        // Admin detected - clear token and throw error
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        throw new Error('Admin access is only available through the admin portal.');
      } catch (adminErr) {
        if (adminErr.message && adminErr.message.includes('admin portal')) {
          throw adminErr;
        }
        // 403 is expected for non-admin users - continue to seller check
        // Only throw if it's a different error (like network error)
        if (adminErr?.response?.status && adminErr?.response?.status !== 403 && adminErr?.response?.status !== 404) {
          // If it's not a 403/404, might be a real error - but continue anyway
        }
        
        // Not an admin, check if seller - if seller, don't allow login in main app
        try {
          await API.get('/seller/products');
          // Seller detected - clear token and throw error
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          localStorage.removeItem('userRole');
          throw new Error('Seller access is only available through the seller portal.');
        } catch (sellerErr) {
          if (sellerErr.message && sellerErr.message.includes('seller portal')) {
            throw sellerErr;
          }
          // 403 is expected for non-seller users - default to customer
          // Only throw if it's a different error
          if (sellerErr?.response?.status && sellerErr?.response?.status !== 403 && sellerErr?.response?.status !== 404) {
            // If it's not a 403/404, might be a real error - but continue anyway
          }
          // Not a seller, default to customer
          userRole = 'customer';
        }
      }
    }
    
    // If somehow admin or seller role is set, clear it
    if (userRole === 'admin') {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      throw new Error('Admin access is only available through the admin portal.');
    }
    
    if (userRole === 'seller') {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      throw new Error('Seller access is only available through the seller portal.');
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

// src/lib/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Suppress console errors for expected 403/404 responses (used for role checking)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log 403/404 errors for role-checking endpoints - these are expected
    const isRoleCheckEndpoint = 
      error.config?.url?.includes('/admin/sellers') ||
      error.config?.url?.includes('/seller/products');
    
    if (isRoleCheckEndpoint && (error.response?.status === 403 || error.response?.status === 404)) {
      // Suppress console error for expected 403/404 on role check endpoints
      // Return the error so calling code can handle it, but don't log it
      return Promise.reject(error);
    }
    
    // For other errors, let them through normally (they'll be logged by default)
    return Promise.reject(error);
  }
);

export default API;

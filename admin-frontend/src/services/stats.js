import API from '../lib/api';

export const fetchKPIs = () => API.get('/admin/stats/kpis');
export const fetchOrdersTrend = (days = 30) => API.get(`/admin/stats/orders-trend?days=${days}`);
export const fetchCategorySales = () => API.get('/admin/stats/category-sales');
export const fetchTopSellers = (limit = 10) => API.get(`/admin/stats/top-sellers?limit=${limit}`);
export const fetchTopProducts = (limit = 10) => API.get(`/admin/stats/top-products?limit=${limit}`);
export const fetchReturnStats = (days = 30) => API.get(`/admin/stats/returns-stats?days=${days}`);
export const fetchPlatformHealth = () => API.get('/admin/stats/platform-health');


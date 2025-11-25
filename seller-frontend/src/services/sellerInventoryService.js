// Seller Inventory API service
import API from '../lib/api';

const sellerInventory = {
  getList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.low_stock_only) queryParams.append('low_stock_only', 'true');
    
    const queryString = queryParams.toString();
    const url = `/seller/inventory${queryString ? `?${queryString}` : ''}`;
    const { data } = await API.get(url);
    return data;
  },

  getOne: async (itemId) => {
    const { data } = await API.get(`/seller/inventory/${itemId}`);
    return data;
  },

  create: async (itemData) => {
    const { data } = await API.post('/seller/inventory/create', itemData);
    return data;
  },

  update: async (itemId, itemData) => {
    const { data } = await API.patch(`/seller/inventory/${itemId}`, itemData);
    return data;
  },

  adjust: async (itemId, change, reason) => {
    const { data } = await API.post(`/seller/inventory/${itemId}/adjust`, {
      change,
      reason
    });
    return data;
  },
};

export default sellerInventory;


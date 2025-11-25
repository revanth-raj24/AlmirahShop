// Admin Inventory API service
import API from '../lib/api';

const adminInventory = {
  getSellers: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const url = `/admin/inventories${queryString ? `?${queryString}` : ''}`;
    const { data } = await API.get(url);
    return data;
  },

  getSellerInventory: async (sellerId) => {
    const { data } = await API.get(`/admin/inventories/${sellerId}`);
    return data;
  },

  updateItem: async (itemId, itemData) => {
    const { data } = await API.patch(`/admin/inventory/${itemId}`, itemData);
    return data;
  },

  notifySeller: async (sellerId) => {
    const { data } = await API.post(`/admin/inventory/notify?seller_id=${sellerId}`);
    return data;
  },
};

export default adminInventory;


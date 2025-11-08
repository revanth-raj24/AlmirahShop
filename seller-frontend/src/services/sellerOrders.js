// Seller Orders API service
import API from '../lib/api';

const sellerOrders = {
  getList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    
    const queryString = queryParams.toString();
    const url = `/seller/orders${queryString ? `?${queryString}` : ''}`;
    const { data } = await API.get(url);
    return data;
  },

  getOne: async (orderItemId) => {
    const { data } = await API.get(`/seller/orders/${orderItemId}`);
    return data;
  },

  accept: async (orderItemId) => {
    const { data } = await API.patch(`/seller/orders/${orderItemId}/accept`);
    return data;
  },

  reject: async (orderItemId, reason) => {
    const { data } = await API.patch(`/seller/orders/${orderItemId}/reject`, { reason });
    return data;
  },
};

export default sellerOrders;


// Admin Return API service
import API from '../lib/api';

export const adminReturns = {
  list: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    if (params.seller_id) queryParams.append('seller_id', params.seller_id);
    if (params.customer_id) queryParams.append('customer_id', params.customer_id);
    if (params.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    const url = `/admin/returns${queryString ? `?${queryString}` : ''}`;
    const { data } = await API.get(url);
    return data;
  },

  getOne: async (orderItemId) => {
    const { data } = await API.get(`/admin/returns/${orderItemId}`);
    return data;
  },

  overrideStatus: async (orderItemId, status, notes) => {
    const { data } = await API.patch(`/admin/returns/${orderItemId}/override-status`, {
      status,
      notes: notes || null,
    });
    return data;
  },
};


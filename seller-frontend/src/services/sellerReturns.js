// Seller Return API service
import API from '../lib/api';

export const sellerReturns = {
  list: async (page = 1, pageSize = 20) => {
    const { data } = await API.get('/seller/returns', {
      params: { page, page_size: pageSize },
    });
    return data;
  },

  getOne: async (orderItemId) => {
    const { data } = await API.get(`/seller/returns/${orderItemId}`);
    return data;
  },

  accept: async (orderItemId) => {
    const { data } = await API.patch(`/seller/returns/${orderItemId}/accept`);
    return data;
  },

  reject: async (orderItemId, notes) => {
    const { data } = await API.patch(`/seller/returns/${orderItemId}/reject`, {
      notes: notes || null,
    });
    return data;
  },

  markReceived: async (orderItemId) => {
    const { data } = await API.patch(`/seller/returns/${orderItemId}/mark-received`);
    return data;
  },
};


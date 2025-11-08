// Return API service
import API from '../lib/api';

export const customerReturns = {
  requestReturn: async (orderItemId, returnData) => {
    const { data } = await API.post(`/returns/request/${orderItemId}`, returnData);
    return data;
  },

  cancelReturn: async (orderItemId) => {
    const { data } = await API.patch(`/returns/cancel/${orderItemId}`);
    return data;
  },

  listMyReturns: async () => {
    const { data } = await API.get('/returns/my');
    return data;
  },
};


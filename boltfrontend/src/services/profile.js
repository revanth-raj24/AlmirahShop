// Profile API service
import API from '../lib/api';

export const profile = {
  getMe: async () => {
    const { data } = await API.get('/profile/me');
    return data;
  },

  update: async (profileData) => {
    const { data } = await API.put('/profile/update', profileData);
    return data;
  },

  changePassword: async (oldPassword, newPassword) => {
    const { data } = await API.put('/profile/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return data;
  },
};

export const address = {
  getAll: async () => {
    const { data } = await API.get('/profile/addresses');
    return data;
  },

  create: async (addressData) => {
    const { data } = await API.post('/profile/addresses', addressData);
    return data;
  },

  update: async (addressId, addressData) => {
    const { data } = await API.put(`/profile/addresses/${addressId}`, addressData);
    return data;
  },

  delete: async (addressId) => {
    const { data } = await API.delete(`/profile/addresses/${addressId}`);
    return data;
  },

  setDefault: async (addressId) => {
    const { data } = await API.post(`/profile/addresses/${addressId}/set-default`);
    return data;
  },
};

export const orders = {
  getAll: async () => {
    const { data } = await API.get('/orders');
    return data;
  },

  getOne: async (orderId) => {
    const { data } = await API.get(`/orders/${orderId}`);
    return data;
  },
};

export const wishlist = {
  getAll: async () => {
    const { data } = await API.get('/wishlist');
    return data;
  },
};


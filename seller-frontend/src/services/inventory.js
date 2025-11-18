// Seller Inventory API service
import API from '../lib/api';

const inventory = {
  getList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    
    const queryString = queryParams.toString();
    const url = `/seller/inventory${queryString ? `?${queryString}` : ''}`;
    const { data } = await API.get(url);
    return data;
  },

  updateProductStock: async (productId, stockData) => {
    const { data } = await API.post(`/seller/inventory/update/${productId}`, stockData);
    return data;
  },

  updateVariantStock: async (variantId, stock) => {
    const { data } = await API.post('/seller/inventory/update-size', {
      variant_id: variantId,
      stock: stock
    });
    return data;
  },

  getLowStock: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    
    const queryString = queryParams.toString();
    const url = `/seller/inventory/low-stock${queryString ? `?${queryString}` : ''}`;
    const { data } = await API.get(url);
    return data;
  },
};

export default inventory;


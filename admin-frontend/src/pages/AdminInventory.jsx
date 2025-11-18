import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Warehouse, AlertTriangle, Package, Edit, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUtils';
import Button from '../components/Button';
import Input from '../components/Input';

export default function AdminInventory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [activeView, setActiveView] = useState('all'); // 'all', 'out-of-stock', 'low-stock'
  const [filters, setFilters] = useState({
    seller_id: '',
    category: '',
    gender: '',
    status_filter: ''
  });
  const [editingItem, setEditingItem] = useState(null);
  const [stockForm, setStockForm] = useState({ stock: '', low_stock_threshold: '' });
  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchSellers();
    fetchInventory();
  }, [user, page, activeView, filters, navigate]);

  const fetchSellers = async () => {
    try {
      const { data } = await API.get('/admin/sellers');
      setSellers(data || []);
    } catch (err) {
      console.error('Failed to fetch sellers:', err);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let url = '/admin/inventory';
      if (activeView === 'out-of-stock') {
        url = '/admin/inventory/out-of-stock';
      } else if (activeView === 'low-stock') {
        url = '/admin/inventory/low-stock';
      }

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      if (filters.seller_id) params.append('seller_id', filters.seller_id);
      if (filters.category) params.append('category', filters.category);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.status_filter && activeView === 'all') params.append('status_filter', filters.status_filter);

      const { data } = await API.get(`${url}?${params.toString()}`);
      setInventoryItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      alert('Failed to fetch inventory');
      setInventoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (productId) => {
    try {
      await API.patch(`/admin/inventory/update/${productId}`, {
        stock: parseInt(stockForm.stock),
        low_stock_threshold: stockForm.low_stock_threshold ? parseInt(stockForm.low_stock_threshold) : undefined
      });
      setEditingItem(null);
      setStockForm({ stock: '', low_stock_threshold: '' });
      fetchInventory();
      alert('Stock updated successfully');
    } catch (err) {
      console.error('Failed to update stock:', err);
      alert(err?.response?.data?.detail || 'Failed to update stock');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'IN_STOCK': 'bg-green-100 text-green-800',
      'LOW_STOCK': 'bg-yellow-100 text-yellow-800',
      'OUT_OF_STOCK': 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getSellerName = (sellerId) => {
    const seller = sellers.find(s => s.id === sellerId);
    return seller ? seller.username : 'Unknown';
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading && inventoryItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-neutral-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-neutral-600 hover:text-neutral-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Warehouse className="w-8 h-8 text-neutral-900" />
              <h1 className="font-serif text-4xl text-neutral-900">Inventory Management</h1>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-4 mb-6 border-b border-neutral-300">
          <button
            onClick={() => {
              setActiveView('all');
              setPage(1);
            }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'all'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              All Inventory
            </div>
          </button>
          <button
            onClick={() => {
              setActiveView('out-of-stock');
              setPage(1);
            }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'out-of-stock'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Out of Stock
            </div>
          </button>
          <button
            onClick={() => {
              setActiveView('low-stock');
              setPage(1);
            }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'low-stock'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Low Stock
            </div>
          </button>
        </div>

        {/* Filters */}
        {activeView === 'all' && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-neutral-200">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-neutral-600" />
              <h3 className="font-medium text-neutral-900">Filters</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Seller</label>
                <select
                  value={filters.seller_id}
                  onChange={(e) => setFilters({ ...filters, seller_id: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded"
                >
                  <option value="">All Sellers</option>
                  {sellers.map(seller => (
                    <option key={seller.id} value={seller.id}>{seller.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                <Input
                  type="text"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  placeholder="Category"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Gender</label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded"
                >
                  <option value="">All</option>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                  <option value="unisex">Unisex</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                <select
                  value={filters.status_filter}
                  onChange={(e) => setFilters({ ...filters, status_filter: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded"
                >
                  <option value="">All Status</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Inventory List */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Product</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Seller</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Stock</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Total Stock</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {inventoryItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-neutral-500">
                      No products found
                    </td>
                  </tr>
                ) : (
                  inventoryItems.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {item.image_url && (
                            <img
                              src={resolveImageUrl(item.image_url)}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div>
                            <div className="font-medium text-neutral-900">{item.name}</div>
                            <div className="text-sm text-neutral-500">{item.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        {item.seller_id ? getSellerName(item.seller_id) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-neutral-600">{item.category || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <div className="text-neutral-900">{item.stock}</div>
                        {item.variants && item.variants.length > 0 && (
                          <div className="text-xs text-neutral-500 mt-1">
                            {item.variants.length} variant{item.variants.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-900">{item.total_stock}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setStockForm({
                              stock: item.stock.toString(),
                              low_stock_threshold: item.low_stock_threshold.toString()
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit Stock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
              <div className="text-sm text-neutral-600">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} products
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-neutral-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-neutral-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-neutral-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Update Stock Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-serif text-neutral-900 mb-4">Update Stock</h2>
              <div className="mb-4">
                <div className="font-medium text-neutral-900 mb-2">{editingItem.name}</div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Product Stock
                  </label>
                  <Input
                    type="number"
                    value={stockForm.stock}
                    onChange={(e) => setStockForm({ ...stockForm, stock: e.target.value })}
                    placeholder="Enter stock quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Low Stock Threshold
                  </label>
                  <Input
                    type="number"
                    value={stockForm.low_stock_threshold}
                    onChange={(e) => setStockForm({ ...stockForm, low_stock_threshold: e.target.value })}
                    placeholder="Enter threshold (default: 5)"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => handleUpdateStock(editingItem.id)}
                  className="flex-1"
                >
                  Update Stock
                </Button>
                <Button
                  onClick={() => {
                    setEditingItem(null);
                    setStockForm({ stock: '', low_stock_threshold: '' });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


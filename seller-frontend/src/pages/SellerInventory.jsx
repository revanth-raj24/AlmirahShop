import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import inventory from '../services/inventory';
import { useAuth } from '../contexts/AuthContext';
import { Package, AlertTriangle, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { resolveImageUrl } from '../utils/imageUtils';

export default function SellerInventory() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [editingItem, setEditingItem] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [stockForm, setStockForm] = useState({ stock: '', low_stock_threshold: '' });

  useEffect(() => {
    if (!user || user.role !== 'seller') {
      navigate('/seller/login');
      return;
    }
    fetchInventory();
  }, [user, page, navigate]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await inventory.getList({ page, page_size: pageSize });
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
      await inventory.updateProductStock(productId, {
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

  const handleUpdateVariantStock = async (variantId, stock) => {
    try {
      await inventory.updateVariantStock(variantId, parseInt(stock));
      setEditingVariant(null);
      fetchInventory();
      alert('Variant stock updated successfully');
    } catch (err) {
      console.error('Failed to update variant stock:', err);
      alert(err?.response?.data?.detail || 'Failed to update variant stock');
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

  const totalPages = Math.ceil(total / pageSize);

  if (loading && inventoryItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/seller/dashboard')}
              className="text-neutral-600 hover:text-neutral-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-serif text-4xl text-neutral-900">Inventory Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/seller/inventory/low-stock')}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors rounded"
            >
              <AlertTriangle className="w-4 h-4" />
              Low Stock Alerts
            </button>
            <span className="text-sm text-neutral-600">Welcome, {user?.username}</span>
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Product</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Price</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Stock</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Total Stock</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {inventoryItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-neutral-500">
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
                            <div className="text-sm text-neutral-500">
                              {item.category} • {item.gender}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-900">${item.price.toFixed(2)}</td>
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
                          Update Stock
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
                {editingItem.variants && editingItem.variants.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-neutral-700 mb-2">Variants:</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {editingItem.variants.map((variant) => (
                        <div key={variant.id} className="flex items-center justify-between p-2 bg-neutral-50 rounded">
                          <div className="text-sm">
                            {variant.size && <span className="font-medium">{variant.size}</span>}
                            {variant.size && variant.color && <span className="mx-1">•</span>}
                            {variant.color && <span>{variant.color}</span>}
                          </div>
                          {editingVariant?.id === variant.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editingVariant.stock}
                                onChange={(e) => setEditingVariant({ ...editingVariant, stock: e.target.value })}
                                className="w-20"
                              />
                              <button
                                onClick={() => handleUpdateVariantStock(variant.id, editingVariant.stock)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingVariant(null)}
                                className="text-sm text-neutral-600 hover:text-neutral-800"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-neutral-600">Stock: {variant.stock}</span>
                              <button
                                onClick={() => setEditingVariant({ ...variant, stock: variant.stock.toString() })}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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


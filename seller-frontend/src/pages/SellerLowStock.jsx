import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventory from '../services/inventory';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUtils';

export default function SellerLowStock() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!user || user.role !== 'seller') {
      navigate('/seller/login');
      return;
    }
    fetchLowStock();
  }, [user, page, navigate]);

  const fetchLowStock = async () => {
    setLoading(true);
    try {
      const data = await inventory.getLowStock({ page, page_size: pageSize });
      setLowStockItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch low stock items:', err);
      alert('Failed to fetch low stock items');
      setLowStockItems([]);
    } finally {
      setLoading(false);
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

  if (loading && lowStockItems.length === 0) {
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
              onClick={() => navigate('/seller/inventory')}
              className="text-neutral-600 hover:text-neutral-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <h1 className="font-serif text-4xl text-neutral-900">Low Stock Alerts</h1>
            </div>
          </div>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-12 text-center">
            <Package className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-neutral-900 mb-2">No Low Stock Items</h2>
            <p className="text-neutral-600">All your products have sufficient stock!</p>
          </div>
        ) : (
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-900">Low Stock Alert</div>
                  <div className="text-sm text-yellow-700 mt-1">
                    You have {total} product{total !== 1 ? 's' : ''} with stock below the threshold. Consider restocking soon.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Product</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Current Stock</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Threshold</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {lowStockItems.map((item) => (
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
                        <td className="px-6 py-4">
                          <div className="font-medium text-neutral-900">{item.total_stock}</div>
                          {item.variants && item.variants.length > 0 && (
                            <div className="text-xs text-neutral-500 mt-1">
                              Product: {item.stock} + Variants: {item.total_stock - item.stock}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-neutral-600">{item.low_stock_threshold}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate('/seller/inventory')}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Update Stock
                          </button>
                        </td>
                      </tr>
                    ))}
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
          </>
        )}
      </div>
    </div>
  );
}


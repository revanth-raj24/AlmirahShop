import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import sellerOrders from '../services/sellerOrders';
import Button from '../components/Button';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Shipped', label: 'Shipped' },
  { value: 'Delivered', label: 'Delivered' },
];

export default function SellerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [rejectModal, setRejectModal] = useState({ open: false, itemId: null, reason: '' });

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await sellerOrders.getList({
        status: statusFilter || undefined,
        page,
        page_size: pageSize,
      });
      setOrders(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      alert(err?.response?.data?.detail || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (itemId) => {
    if (!confirm('Are you sure you want to accept this order item?')) return;
    try {
      await sellerOrders.accept(itemId);
      alert('Order item accepted successfully!');
      fetchOrders();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to accept order item');
    }
  };

  const handleReject = async () => {
    if (!rejectModal.itemId) return;
    try {
      await sellerOrders.reject(rejectModal.itemId, rejectModal.reason);
      alert('Order item rejected successfully!');
      setRejectModal({ open: false, itemId: null, reason: '' });
      fetchOrders();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to reject order item');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepted':
        return 'bg-green-100 text-green-700';
      case 'Rejected':
        return 'bg-red-100 text-red-700';
      case 'Shipped':
        return 'bg-blue-100 text-blue-700';
      case 'Delivered':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-neutral-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-serif text-3xl text-neutral-900 mb-2">My Orders</h1>
              <p className="text-neutral-600">Manage and track your order items</p>
            </div>
            <button
              onClick={() => navigate('/seller/dashboard')}
              className="px-4 py-2 text-sm bg-neutral-300 text-neutral-900 hover:bg-neutral-400 rounded transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-neutral-300 p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-neutral-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-neutral-300 focus:outline-none focus:border-neutral-900"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-neutral-600">Loading orders...</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white border border-neutral-300">
            <div className="text-neutral-600">No orders found</div>
          </div>
        ) : (
          <>
            <div className="bg-white border border-neutral-300 overflow-hidden">
              <table className="w-full">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Order Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Product</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Quantity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {orders.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {formatDate(item.order_ordered_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-neutral-900 font-medium">{item.customer_username || 'N/A'}</div>
                        <div className="text-neutral-600 text-xs">{item.customer_email || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-neutral-900 font-medium">{item.product?.name || 'N/A'}</div>
                        {item.order_ship_city && (
                          <div className="text-neutral-600 text-xs">
                            {item.order_ship_city}, {item.order_ship_pincode}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        {item.rejection_reason && (
                          <div className="text-xs text-red-600 mt-1">{item.rejection_reason}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {item.status === 'Pending' || item.status === 'Rejected' ? (
                            <button
                              onClick={() => handleAccept(item.id)}
                              className="px-3 py-1 text-xs bg-green-600 text-white hover:bg-green-700 rounded"
                            >
                              Accept
                            </button>
                          ) : null}
                          {item.status === 'Pending' || item.status === 'Accepted' ? (
                            <button
                              onClick={() => setRejectModal({ open: true, itemId: item.id, reason: '' })}
                              className="px-3 py-1 text-xs bg-red-600 text-white hover:bg-red-700 rounded"
                            >
                              Reject
                            </button>
                          ) : null}
                          <button
                            onClick={() => navigate(`/seller/orders/${item.id}`)}
                            className="px-3 py-1 text-xs bg-neutral-600 text-white hover:bg-neutral-700 rounded"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-neutral-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Reject Modal */}
        {rejectModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h2 className="font-serif text-xl mb-4">Reject Order Item</h2>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Reason (optional):
              </label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 focus:outline-none focus:border-neutral-900 mb-4"
                rows={3}
                placeholder="e.g., Out of stock"
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleReject}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => setRejectModal({ open: false, itemId: null, reason: '' })}
                  className="bg-neutral-300 text-neutral-900 hover:bg-neutral-400"
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


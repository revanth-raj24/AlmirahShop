import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Package, Truck, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUtils';
import { customerReturns } from '../services/returns';

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returnModal, setReturnModal] = useState({ open: false, item: null });
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: ordersData } = await API.get('/orders');
      setOrders(ordersData || []);
      // Products are now included in order items, no need to fetch separately
      setProducts([]);
    } catch (_) {
      setOrders([]);
      setProducts([]);
    }
    setLoading(false);
  };

  const productById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const getStatusIcon = (status) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'pending':
        return <Package className="w-5 h-5 text-neutral-600" />;
      case 'processing':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Package className="w-5 h-5 text-neutral-600" />;
    }
  };

  const getStatusColor = (status) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'pending':
        return 'text-neutral-600';
      case 'processing':
        return 'text-blue-600';
      case 'shipped':
        return 'text-blue-600';
      case 'delivered':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-neutral-600';
    }
  };

  const canReturnItem = (item) => {
    return item.status === 'Delivered' && 
           item.is_return_eligible !== false && 
           (!item.return_status || item.return_status === 'None');
  };

  const handleRequestReturn = (item) => {
    setReturnModal({ open: true, item });
    setReturnReason('');
    setReturnNotes('');
  };

  const handleSubmitReturn = async () => {
    if (!returnReason.trim()) {
      alert('Please provide a return reason');
      return;
    }
    setSubmitting(true);
    try {
      await customerReturns.requestReturn(returnModal.item.id, {
        reason: returnReason,
        notes: returnNotes || null,
      });
      setReturnModal({ open: false, item: null });
      setReturnReason('');
      setReturnNotes('');
      fetchAll();
      alert('Return request submitted successfully');
    } catch (err) {
      console.error('Failed to submit return:', err);
      alert(err?.response?.data?.detail || 'Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-4xl text-neutral-900 mb-4">No Orders Yet</h1>
          <p className="text-neutral-600 mb-8">Start shopping to see your orders here</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-4xl text-neutral-900 mb-12">My Orders</h1>

        <div className="space-y-8">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-neutral-300/20 p-6 hover:border-neutral-300/40 transition-colors duration-300"
            >
              <div className="flex items-start justify-between mb-6 pb-6 border-b border-neutral-300/10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(order.status)}
                    <span className={`font-sans uppercase text-sm tracking-wider ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-neutral-600 text-sm">
                    Order placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-neutral-600 text-sm mb-1">Order Total</p>
                  <p className="font-sans text-2xl text-neutral-900 font-medium">
                    ${parseFloat(order.total_price).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {(order.order_items || []).map((item) => {
                  // Use product from order item if available, otherwise fallback to productById
                  const p = item.product || productById.get(item.product_id) || {};
                  const imageUrl = resolveImageUrl(p.image_url);
                  return (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-20 h-24 bg-neutral-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={p.name || 'Product'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-serif text-lg text-neutral-900 mb-1">{p.name || 'Product'}</h3>
                        <p className="text-neutral-600 text-sm mb-2">Quantity: {item.quantity}</p>
                        <p className="font-sans text-neutral-900">
                          ${parseFloat(item.price).toFixed(2)} each
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-sans text-neutral-900 font-medium mb-2">
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </p>
                        {canReturnItem(item) && (
                          <button
                            onClick={() => handleRequestReturn(item)}
                            className="px-3 py-1.5 text-sm border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Return Item
                          </button>
                        )}
                        {item.return_status && item.return_status !== 'None' && (
                          <button
                            onClick={() => navigate('/profile/returns')}
                            className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            View Return Status
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Return Request Modal */}
      {returnModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="font-serif text-2xl text-neutral-900 mb-4">Request Return</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-1">
                  Return Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="">Select a reason</option>
                  <option value="Defective/Damaged">Defective/Damaged</option>
                  <option value="Wrong Item">Wrong Item</option>
                  <option value="Size/Color Mismatch">Size/Color Mismatch</option>
                  <option value="Not as Described">Not as Described</option>
                  <option value="Changed Mind">Changed Mind</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="Please provide any additional details..."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setReturnModal({ open: false, item: null })}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReturn}
                  className="flex-1 px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                  disabled={submitting || !returnReason.trim()}
                >
                  {submitting ? 'Submitting...' : 'Submit Return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

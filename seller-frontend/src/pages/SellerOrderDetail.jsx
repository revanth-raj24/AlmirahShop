import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import sellerOrders from '../services/sellerOrders';
import Button from '../components/Button';
import { resolveImageUrl } from '../utils/imageUtils';

export default function SellerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState({ open: false, reason: '' });

  useEffect(() => {
    fetchOrderItem();
  }, [id]);

  const fetchOrderItem = async () => {
    setLoading(true);
    try {
      const data = await sellerOrders.getOne(id);
      setItem(data);
    } catch (err) {
      console.error('Failed to fetch order item:', err);
      alert(err?.response?.data?.detail || 'Failed to load order item');
      navigate('/seller/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!confirm('Are you sure you want to accept this order item?')) return;
    try {
      await sellerOrders.accept(id);
      alert('Order item accepted successfully!');
      fetchOrderItem();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to accept order item');
    }
  };

  const handleReject = async () => {
    try {
      await sellerOrders.reject(id, rejectModal.reason);
      alert('Order item rejected successfully!');
      setRejectModal({ open: false, reason: '' });
      fetchOrderItem();
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


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Order item not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/seller/orders')}
            className="text-neutral-600 hover:text-neutral-900 mb-4"
          >
            ← Back to Orders
          </button>
          <h1 className="font-serif text-3xl text-neutral-900 mb-2">Order Item Details</h1>
        </div>

        <div className="bg-white border border-neutral-300 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Info */}
            <div>
              <h2 className="font-serif text-xl mb-4">Product Information</h2>
              {item.product && (
                <>
                  {item.product.image_url && (
                    <div className="mb-4">
                      <img
                        src={resolveImageUrl(item.product.image_url)}
                        alt={item.product.name}
                        className="w-full max-w-xs h-auto border border-neutral-300"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-neutral-600">Name:</span>
                      <div className="font-medium">{item.product.name}</div>
                    </div>
                    {item.product.description && (
                      <div>
                        <span className="text-sm text-neutral-600">Description:</span>
                        <div className="text-neutral-700">{item.product.description}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-neutral-600">Price:</span>
                      <div className="font-medium">₹{item.price.toFixed(2)} each</div>
                    </div>
                    <div>
                      <span className="text-sm text-neutral-600">Quantity:</span>
                      <div className="font-medium">{item.quantity}</div>
                    </div>
                    <div>
                      <span className="text-sm text-neutral-600">Total:</span>
                      <div className="font-medium text-lg">₹{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Order & Customer Info */}
            <div>
              <h2 className="font-serif text-xl mb-4">Order & Customer Information</h2>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-neutral-600">Order Date:</span>
                  <div className="font-medium">{formatDate(item.order_ordered_at)}</div>
                </div>
                <div>
                  <span className="text-sm text-neutral-600">Status:</span>
                  <div>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
                {item.rejection_reason && (
                  <div>
                    <span className="text-sm text-neutral-600">Rejection Reason:</span>
                    <div className="text-red-600">{item.rejection_reason}</div>
                  </div>
                )}
                <div>
                  <span className="text-sm text-neutral-600">Customer:</span>
                  <div className="font-medium">{item.customer_username || 'N/A'}</div>
                  <div className="text-sm text-neutral-600">{item.customer_email || ''}</div>
                </div>
                {/* Payment Information */}
                {item.order_payment_method && (
                  <div className="mt-4 pt-4 border-t border-neutral-200">
                    <span className="text-sm text-neutral-600">Payment:</span>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{item.order_payment_method}</span>
                        {item.order_payment_status && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.order_payment_status === 'PAID' || item.order_payment_status === 'PENDING_COD'
                              ? 'bg-green-100 text-green-700'
                              : item.order_payment_status === 'FAILED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.order_payment_status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      {item.order_payment_id && (
                        <div className="text-xs text-neutral-500">
                          Payment ID: {item.order_payment_id.substring(0, 12)}...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {(item.order_ship_address_line1 || item.order_ship_city) && (
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <h2 className="font-serif text-xl mb-4">Shipping Address</h2>
              <div className="space-y-1 text-neutral-700">
                <div>{item.order_ship_name}</div>
                {item.order_ship_phone && <div>{item.order_ship_phone}</div>}
                {item.order_ship_address_line1 && <div>{item.order_ship_address_line1}</div>}
                {item.order_ship_address_line2 && <div>{item.order_ship_address_line2}</div>}
                <div>
                  {item.order_ship_city && `${item.order_ship_city}, `}
                  {item.order_ship_state && `${item.order_ship_state} `}
                  {item.order_ship_pincode && item.order_ship_pincode}
                </div>
                {item.order_ship_country && <div>{item.order_ship_country}</div>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="flex gap-3">
              {item.status === 'Pending' || item.status === 'Rejected' ? (
                <Button onClick={handleAccept} className="bg-green-600 hover:bg-green-700">
                  Accept Order
                </Button>
              ) : null}
              {item.status === 'Pending' || item.status === 'Accepted' ? (
                <Button
                  onClick={() => setRejectModal({ open: true, reason: '' })}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Reject Order
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

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
              <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700">
                Reject
              </Button>
              <Button
                onClick={() => setRejectModal({ open: false, reason: '' })}
                className="bg-neutral-300 text-neutral-900 hover:bg-neutral-400"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminReturns } from '../services/adminReturns';
import { resolveImageUrl } from '../utils/imageUtils';
import { RotateCcw, Clock, CheckCircle, XCircle, Package, Truck } from 'lucide-react';

const ALLOWED_STATUSES = [
  'None',
  'ReturnRequested',
  'ReturnAccepted',
  'ReturnRejected',
  'ReturnInTransit',
  'ReturnReceived',
  'RefundProcessed',
];

export default function AdminReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [returnItem, setReturnItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overrideModal, setOverrideModal] = useState({ open: false, status: '', notes: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchReturnItem();
  }, [id]);

  const fetchReturnItem = async () => {
    setLoading(true);
    try {
      const data = await adminReturns.getOne(id);
      setReturnItem(data);
    } catch (err) {
      console.error('Failed to fetch return item:', err);
      alert(err?.response?.data?.detail || 'Failed to load return item');
      navigate('/admin/returns');
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideStatus = async () => {
    if (!overrideModal.status) {
      alert('Please select a status');
      return;
    }
    setActionLoading(true);
    try {
      await adminReturns.overrideStatus(id, overrideModal.status, overrideModal.notes);
      alert('Return status updated successfully!');
      setOverrideModal({ open: false, status: '', notes: '' });
      fetchReturnItem();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to update return status');
    } finally {
      setActionLoading(false);
    }
  };

  const formatReturnStatus = (status) => {
    if (!status || status === 'None') return 'No Return';
    return status.replace(/([A-Z])/g, ' $1').trim();
  };

  const getReturnStatusColor = (status) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'returnrequested':
        return 'bg-yellow-100 text-yellow-700';
      case 'returnaccepted':
        return 'bg-blue-100 text-blue-700';
      case 'returnrejected':
        return 'bg-red-100 text-red-700';
      case 'returnintransit':
        return 'bg-blue-100 text-blue-700';
      case 'returnreceived':
        return 'bg-green-100 text-green-700';
      case 'refundprocessed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getReturnStatusIcon = (status) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'returnrequested':
        return <Clock className="w-5 h-5" />;
      case 'returnaccepted':
        return <CheckCircle className="w-5 h-5" />;
      case 'returnrejected':
        return <XCircle className="w-5 h-5" />;
      case 'returnintransit':
        return <Truck className="w-5 h-5" />;
      case 'returnreceived':
        return <Package className="w-5 h-5" />;
      case 'refundprocessed':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <RotateCcw className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!returnItem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600">Return item not found</p>
          <button
            onClick={() => navigate('/admin/returns')}
            className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded"
          >
            Back to Returns
          </button>
        </div>
      </div>
    );
  }

  const product = returnItem.product || {};
  const imageUrl = resolveImageUrl(product.image_url);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/admin/returns')}
          className="mb-4 text-blue-600 hover:text-blue-900"
        >
          ← Back to Returns
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">Return Request Details</h1>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getReturnStatusColor(returnItem.return_status)}`}>
              {getReturnStatusIcon(returnItem.return_status)}
              {formatReturnStatus(returnItem.return_status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Product Information</h2>
              <div className="flex gap-4">
                <div className="w-24 h-32 bg-neutral-100 rounded overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={product.name || 'Product'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">{product.name || 'Product'}</h3>
                  <p className="text-sm text-neutral-600 mt-1">Quantity: {returnItem.quantity}</p>
                  <p className="text-sm text-neutral-600">Price: ₹{parseFloat(returnItem.price).toFixed(2)} each</p>
                  <p className="text-sm font-semibold text-neutral-900 mt-2">
                    Total: ₹{(parseFloat(returnItem.price) * returnItem.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Customer Information</h2>
              <div className="space-y-2">
                <p className="text-sm"><span className="font-semibold">Name:</span> {returnItem.customer_username || 'N/A'}</p>
                <p className="text-sm"><span className="font-semibold">Email:</span> {returnItem.customer_email || 'N/A'}</p>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-neutral-900 mb-2">Seller Information</h3>
                <p className="text-sm"><span className="font-semibold">Seller ID:</span> {returnItem.seller_id || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Shipping Address</h2>
            <div className="bg-neutral-50 p-4 rounded">
              <p className="text-sm">{returnItem.order_ship_name || 'N/A'}</p>
              <p className="text-sm">{returnItem.order_ship_phone || ''}</p>
              <p className="text-sm">{returnItem.order_ship_address_line1 || ''}</p>
              {returnItem.order_ship_address_line2 && (
                <p className="text-sm">{returnItem.order_ship_address_line2}</p>
              )}
              <p className="text-sm">
                {returnItem.order_ship_city}, {returnItem.order_ship_state} {returnItem.order_ship_pincode}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Return Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900">Return Reason:</p>
                <p className="text-sm text-neutral-600">{returnItem.return_reason || 'N/A'}</p>
              </div>
              {returnItem.return_notes && (
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Notes:</p>
                  <p className="text-sm text-neutral-600">{returnItem.return_notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-neutral-900">Requested At:</p>
                <p className="text-sm text-neutral-600">
                  {returnItem.return_requested_at
                    ? new Date(returnItem.return_requested_at).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
              {returnItem.return_processed_at && (
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Processed At:</p>
                  <p className="text-sm text-neutral-600">
                    {new Date(returnItem.return_processed_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t">
            <button
              onClick={() => setOverrideModal({ open: true, status: returnItem.return_status || '', notes: returnItem.return_notes || '' })}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Override Status
            </button>
          </div>
        </div>
      </div>

      {/* Override Status Modal */}
      {overrideModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-neutral-900 mb-4">Override Return Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-1">
                  New Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={overrideModal.status}
                  onChange={(e) => setOverrideModal({ ...overrideModal, status: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="">Select a status</option>
                  {ALLOWED_STATUSES.map(status => (
                    <option key={status} value={status}>{formatReturnStatus(status)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-1">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={overrideModal.notes}
                  onChange={(e) => setOverrideModal({ ...overrideModal, notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="Add admin notes..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOverrideModal({ open: false, status: '', notes: '' })}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded hover:bg-neutral-50"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverrideStatus}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={actionLoading || !overrideModal.status}
                >
                  {actionLoading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


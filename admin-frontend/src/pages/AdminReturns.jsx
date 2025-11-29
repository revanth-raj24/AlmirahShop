import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminReturns } from '../services/adminReturns';
import { resolveImageUrl } from '../utils/imageUtils';
import { RotateCcw, Clock, CheckCircle, XCircle, Package, Truck, ArrowLeft, LogOut } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'ReturnRequested', label: 'Requested' },
  { value: 'ReturnAccepted', label: 'Accepted' },
  { value: 'ReturnRejected', label: 'Rejected' },
  { value: 'ReturnInTransit', label: 'In Transit' },
  { value: 'ReturnReceived', label: 'Received' },
  { value: 'RefundProcessed', label: 'Refunded' },
];

import { useAuth } from '../contexts/AuthContext';

export default function AdminReturns() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sellerIdFilter, setSellerIdFilter] = useState('');
  const [customerIdFilter, setCustomerIdFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);

  useEffect(() => {
    fetchReturns();
  }, [statusFilter, sellerIdFilter, customerIdFilter, page]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const data = await adminReturns.list({
        page,
        page_size: pageSize,
        status: statusFilter || undefined,
        seller_id: sellerIdFilter || undefined,
        customer_id: customerIdFilter || undefined,
      });
      setReturns(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch returns:', err);
      alert(err?.response?.data?.detail || 'Failed to load returns');
    } finally {
      setLoading(false);
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
        return <Clock className="w-4 h-4" />;
      case 'returnaccepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'returnrejected':
        return <XCircle className="w-4 h-4" />;
      case 'returnintransit':
        return <Truck className="w-4 h-4" />;
      case 'returnreceived':
        return <Package className="w-4 h-4" />;
      case 'refundprocessed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <RotateCcw className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-neutral-900">Return Management</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors bg-white border border-neutral-300 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <button
              onClick={async () => {
                await signOut();
                navigate('/admin/login');
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors bg-white border border-neutral-300 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-500"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Seller ID"
            value={sellerIdFilter}
            onChange={(e) => {
              setSellerIdFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-500"
          />
          <input
            type="number"
            placeholder="Customer ID"
            value={customerIdFilter}
            onChange={(e) => {
              setCustomerIdFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-500"
          />
        </div>

        {returns.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600">No return requests found</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Seller ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Requested</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {returns.map((returnItem) => {
                    const product = returnItem.product || {};
                    const imageUrl = resolveImageUrl(product.image_url);
                    
                    return (
                      <tr key={returnItem.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-neutral-100 rounded overflow-hidden mr-3">
                              <img
                                src={imageUrl}
                                alt={product.name || 'Product'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-neutral-900">{product.name || 'Product'}</div>
                              <div className="text-sm text-neutral-500">Qty: {returnItem.quantity}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-neutral-900">{returnItem.customer_username || 'N/A'}</div>
                          <div className="text-sm text-neutral-500">{returnItem.customer_email || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                          {returnItem.seller_id || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getReturnStatusColor(returnItem.return_status)}`}>
                            {getReturnStatusIcon(returnItem.return_status)}
                            {formatReturnStatus(returnItem.return_status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-neutral-900">{returnItem.return_reason || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {returnItem.return_requested_at
                            ? new Date(returnItem.return_requested_at).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => navigate(`/admin/returns/${returnItem.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > pageSize && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-neutral-600">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} returns
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-neutral-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * pageSize >= total}
                    className="px-4 py-2 border border-neutral-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


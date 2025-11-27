import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { resolveImageUrl } from '../utils/imageUtils';
import { Package, Eye, CheckCircle, XCircle, Clock, User, Mail, Phone, LogOut } from 'lucide-react';
import Button from '../components/Button';

export default function AdminProductVerification() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchPendingProducts();
  }, [user, navigate]);

  const fetchPendingProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.get('/admin/products/pending');
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching pending products:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch pending products');
      if (err?.response?.status === 403) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (productId) => {
    navigate(`/admin/products/${productId}`);
  };

  const handleApprove = async (productId) => {
    if (!confirm('Are you sure you want to approve this product? It will become visible to customers.')) {
      return;
    }

    setProcessing(productId);
    try {
      await API.patch(`/admin/products/${productId}/approve`);
      alert('Product approved successfully!');
      fetchPendingProducts();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to approve product');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectClick = (product) => {
    setSelectedProduct(product);
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    if (!selectedProduct) return;

    setProcessing(selectedProduct.id);
    try {
      await API.patch(`/admin/products/${selectedProduct.id}/reject`, { notes: rejectNotes });
      alert('Product rejected successfully');
      fetchPendingProducts();
      setShowRejectModal(false);
      setSelectedProduct(null);
      setRejectNotes('');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to reject product');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
          <div className="text-neutral-600 text-lg">Loading pending products...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-4xl text-neutral-900 mb-2">Product Verification</h1>
            <p className="text-neutral-600">Review and approve seller-submitted products</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors bg-white border border-neutral-300 rounded-lg"
            >
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Products Table */}
        {products.length > 0 ? (
          <div className="bg-white border border-neutral-300 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Image</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Product Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Seller</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Submitted</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <div className="w-16 h-16 bg-neutral-100 rounded overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={resolveImageUrl(product.image_url)}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-900">{product.name}</div>
                        {product.description && (
                          <div className="text-xs text-neutral-500 mt-1 line-clamp-2">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-neutral-900">
                          ₹{product.price.toFixed(2)}
                        </div>
                        {product.discounted_price && (
                          <div className="text-xs text-neutral-500 line-through">
                            ₹{product.discounted_price.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-neutral-600">
                          {product.category || 'N/A'}
                        </div>
                        {product.gender && (
                          <div className="text-xs text-neutral-500 capitalize">
                            {product.gender}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-neutral-900 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {product.seller_username || 'N/A'}
                          </div>
                          {product.seller_email && (
                            <div className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {product.seller_email}
                            </div>
                          )}
                          {product.seller_phone && (
                            <div className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" />
                              {product.seller_phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-neutral-600">
                          {product.submitted_at
                            ? new Date(product.submitted_at).toLocaleDateString()
                            : 'N/A'}
                        </div>
                        {product.submitted_at && (
                          <div className="text-xs text-neutral-500">
                            {new Date(product.submitted_at).toLocaleTimeString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(product.id)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1 transition-colors"
                            title="View / Edit"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => handleApprove(product.id)}
                            disabled={processing === product.id}
                            className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 disabled:bg-neutral-400 disabled:cursor-not-allowed rounded flex items-center gap-1 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectClick(product)}
                            disabled={processing === product.id}
                            className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 disabled:bg-neutral-400 disabled:cursor-not-allowed rounded flex items-center gap-1 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="font-serif text-xl text-neutral-900 mb-2">No Pending Products</h3>
            <p className="text-neutral-600">All products have been reviewed.</p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="font-serif text-2xl text-neutral-900 mb-4">Reject Product</h3>
            <p className="text-sm text-neutral-600 mb-2">
              Product: <span className="font-medium">{selectedProduct.name}</span>
            </p>
            <p className="text-sm text-neutral-600 mb-4">
              Please provide a reason for rejecting this product. This will be visible to the seller.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full h-32 p-3 border border-neutral-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={handleReject}
                disabled={!rejectNotes.trim() || processing === selectedProduct.id}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {processing === selectedProduct.id ? 'Processing...' : 'Confirm Reject'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedProduct(null);
                  setRejectNotes('');
                }}
                className="px-6 py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-900 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


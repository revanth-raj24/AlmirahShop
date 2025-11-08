import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { resolveImageUrl } from '../utils/imageUtils';
import { CheckCircle, XCircle, ArrowLeft, User, Mail, Phone, Calendar, Package } from 'lucide-react';
import Button from '../components/Button';

export default function AdminProductDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    if (id) {
      fetchProductDetails();
    }
  }, [user, navigate, id]);

  const fetchProductDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.get(`/admin/products/${id}`);
      setProduct(data);
    } catch (err) {
      console.error('Error fetching product details:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch product details');
      if (err?.response?.status === 403) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this product? It will become visible to customers.')) {
      return;
    }

    setProcessing(true);
    try {
      await API.patch(`/admin/products/${id}/approve`);
      alert('Product approved successfully!');
      navigate('/admin/products/pending');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to approve product');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      await API.patch(`/admin/products/${id}/reject`, { notes: rejectNotes });
      alert('Product rejected successfully');
      navigate('/admin/products/pending');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to reject product');
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
      setRejectNotes('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
          <div className="text-neutral-600 text-lg">Loading product details...</div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="font-serif text-xl text-neutral-900 mb-2">Product Not Found</h3>
          <p className="text-neutral-600 mb-4">{error || 'The product you are looking for does not exist.'}</p>
          <Button onClick={() => navigate('/admin/products/pending')}>
            Back to Pending Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/admin/products/pending')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors bg-white border border-neutral-300 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pending Products
          </button>
        </div>

        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Product Image */}
            <div>
              <div className="aspect-[3/4] bg-neutral-100 rounded-lg overflow-hidden mb-4">
                {product.image_url ? (
                  <img
                    src={resolveImageUrl(product.image_url)}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    <Package className="w-16 h-16" />
                  </div>
                )}
              </div>
            </div>

            {/* Product Details */}
            <div>
              <h1 className="font-serif text-3xl text-neutral-900 mb-4">{product.name}</h1>
              
              {product.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Description</h3>
                  <p className="text-neutral-700 whitespace-pre-wrap">{product.description}</p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <span className="text-sm font-medium text-neutral-600">Price: </span>
                  <span className="text-2xl font-bold text-neutral-900">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.discounted_price && (
                    <span className="ml-2 text-lg text-neutral-500 line-through">
                      ${product.discounted_price.toFixed(2)}
                    </span>
                  )}
                </div>

                {product.category && (
                  <div>
                    <span className="text-sm font-medium text-neutral-600">Category: </span>
                    <span className="text-neutral-900">{product.category}</span>
                  </div>
                )}

                {product.gender && (
                  <div>
                    <span className="text-sm font-medium text-neutral-600">Gender: </span>
                    <span className="text-neutral-900 capitalize">{product.gender}</span>
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium text-neutral-600">Status: </span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    product.verification_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    product.verification_status === 'Approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {product.verification_status}
                  </span>
                </div>

                {product.submitted_at && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Calendar className="w-4 h-4" />
                    <span>Submitted: {new Date(product.submitted_at).toLocaleString()}</span>
                  </div>
                )}

                {product.verification_notes && (
                  <div className="bg-red-50 border border-red-200 rounded p-4">
                    <h4 className="text-sm font-medium text-red-900 mb-1">Rejection Notes</h4>
                    <p className="text-sm text-red-700">{product.verification_notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seller Information */}
          <div className="border-t border-neutral-300 pt-6 mb-8">
            <h2 className="font-serif text-2xl text-neutral-900 mb-4">Seller Information</h2>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                    <User className="w-4 h-4" />
                    Username
                  </div>
                  <div className="font-medium text-neutral-900">
                    {product.seller_username || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                  <div className="font-medium text-neutral-900">
                    {product.seller_email || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                    <Phone className="w-4 h-4" />
                    Phone
                  </div>
                  <div className="font-medium text-neutral-900">
                    {product.seller_phone || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-neutral-300 pt-6 flex gap-4">
            <Button
              onClick={handleApprove}
              disabled={processing || product.verification_status === 'Approved'}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-5 h-5" />
              Approve Product
            </Button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={processing || product.verification_status === 'Rejected'}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <XCircle className="w-5 h-5" />
              Reject Product
            </button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="font-serif text-2xl text-neutral-900 mb-4">Reject Product</h3>
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
              <Button
                onClick={handleReject}
                disabled={!rejectNotes.trim() || processing}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Reject
              </Button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
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


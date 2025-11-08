import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerReturns } from '../services/returns';
import { useAuth } from '../contexts/AuthContext';
import { resolveImageUrl } from '../utils/imageUtils';
import { RotateCcw, Clock, CheckCircle, XCircle, Package, Truck } from 'lucide-react';

export default function Returns() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchReturns();
  }, [user]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const data = await customerReturns.listMyReturns();
      setReturns(data || []);
    } catch (err) {
      console.error('Failed to fetch returns:', err);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const getReturnStatusIcon = (status) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'returnrequested':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'returnaccepted':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'returnrejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'returnintransit':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'returnreceived':
        return <Package className="w-5 h-5 text-green-600" />;
      case 'refundprocessed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <RotateCcw className="w-5 h-5 text-neutral-600" />;
    }
  };

  const getReturnStatusColor = (status) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'returnrequested':
        return 'text-yellow-600 bg-yellow-50';
      case 'returnaccepted':
        return 'text-blue-600 bg-blue-50';
      case 'returnrejected':
        return 'text-red-600 bg-red-50';
      case 'returnintransit':
        return 'text-blue-600 bg-blue-50';
      case 'returnreceived':
        return 'text-green-600 bg-green-50';
      case 'refundprocessed':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-neutral-600 bg-neutral-50';
    }
  };

  const formatReturnStatus = (status) => {
    if (!status || status === 'None') return 'No Return';
    return status.replace(/([A-Z])/g, ' $1').trim();
  };

  const handleCancelReturn = async (orderItemId) => {
    if (!window.confirm('Are you sure you want to cancel this return request?')) {
      return;
    }
    try {
      await customerReturns.cancelReturn(orderItemId);
      fetchReturns();
      alert('Return request cancelled successfully');
    } catch (err) {
      console.error('Failed to cancel return:', err);
      alert(err?.response?.data?.detail || 'Failed to cancel return request');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (returns.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <RotateCcw className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h1 className="font-serif text-4xl text-neutral-900 mb-4">No Returns</h1>
          <p className="text-neutral-600 mb-8">You haven't requested any returns yet</p>
          <button
            onClick={() => navigate('/orders')}
            className="btn-primary"
          >
            View Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-4xl text-neutral-900 mb-12">My Returns</h1>

        <div className="space-y-8">
          {returns.map((returnItem) => {
            const product = returnItem.product || {};
            const imageUrl = resolveImageUrl(product.image_url);
            
            return (
              <div
                key={returnItem.id}
                className="bg-white border border-neutral-300/20 p-6 hover:border-neutral-300/40 transition-colors duration-300"
              >
                <div className="flex items-start justify-between mb-6 pb-6 border-b border-neutral-300/10">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getReturnStatusIcon(returnItem.return_status)}
                      <span className={`font-sans uppercase text-sm tracking-wider px-3 py-1 rounded ${getReturnStatusColor(returnItem.return_status)}`}>
                        {formatReturnStatus(returnItem.return_status)}
                      </span>
                    </div>
                    {returnItem.return_requested_at && (
                      <p className="text-neutral-600 text-sm">
                        Requested on {new Date(returnItem.return_requested_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-neutral-600 text-sm mb-1">Item Value</p>
                    <p className="font-sans text-2xl text-neutral-900 font-medium">
                      ${(parseFloat(returnItem.price) * returnItem.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 mb-6">
                  <div className="w-20 h-24 bg-neutral-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={product.name || 'Product'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-lg text-neutral-900 mb-1">{product.name || 'Product'}</h3>
                    <p className="text-neutral-600 text-sm mb-2">Quantity: {returnItem.quantity}</p>
                    <p className="font-sans text-neutral-900">
                      ${parseFloat(returnItem.price).toFixed(2)} each
                    </p>
                  </div>
                </div>

                {returnItem.return_reason && (
                  <div className="mb-4 p-4 bg-neutral-50 rounded">
                    <p className="text-sm font-semibold text-neutral-900 mb-1">Return Reason:</p>
                    <p className="text-sm text-neutral-600">{returnItem.return_reason}</p>
                  </div>
                )}

                {returnItem.return_notes && (
                  <div className="mb-4 p-4 bg-neutral-50 rounded">
                    <p className="text-sm font-semibold text-neutral-900 mb-1">Notes:</p>
                    <p className="text-sm text-neutral-600">{returnItem.return_notes}</p>
                  </div>
                )}

                {returnItem.return_status === 'ReturnRequested' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCancelReturn(returnItem.id)}
                      className="px-4 py-2 text-sm border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      Cancel Return
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


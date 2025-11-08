import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Package, Truck, CheckCircle, XCircle } from 'lucide-react';

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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
                  const imageUrl = p.image_url || 'https://via.placeholder.com/400x533?text=Product';
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
                        <p className="font-sans text-neutral-900 font-medium">
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

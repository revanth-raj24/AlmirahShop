import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { resolveImageUrl } from '../utils/imageUtils';
import { ShoppingCart, Eye, X, ArrowLeft, LogOut } from 'lucide-react';

export default function AdminOrders() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.get('/admin/orders');
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch orders');
      if (err?.response?.status === 403) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrderDetails = async (orderId) => {
    setSelectedOrder(orderId);
    setLoadingOrderDetails(true);
    try {
      const { data } = await API.get(`/admin/orders/${orderId}`);
      setOrderDetails(data);
      
      // Fetch product details for each order item using admin endpoint
      if (data.order_items && data.order_items.length > 0) {
        const productPromises = data.order_items.map(item => 
          API.get(`/admin/products/${item.product_id}`).catch(() => null)
        );
        const productResponses = await Promise.all(productPromises);
        const products = productResponses
          .filter(res => res !== null)
          .map(res => res.data);
        
        // Merge product details with order items
        const enrichedOrderItems = data.order_items.map(item => {
          const product = products.find(p => p.id === item.product_id);
          return { ...item, product };
        });
        
        setOrderDetails({ ...data, order_items: enrichedOrderItems });
      }
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to fetch order details');
      setSelectedOrder(null);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setOrderDetails(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
          <div className="text-neutral-600 text-lg">Loading orders...</div>
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
            <h1 className="font-serif text-4xl text-neutral-900 mb-2">Order Management</h1>
            <p className="text-neutral-600">View and manage all orders in the platform</p>
          </div>
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Order ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">User ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Total Price</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Address</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm text-neutral-600">#{order.id}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{order.user_id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">₹{order.total_price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {order.delivery_address ? (
                        <div>
                          <div className="font-medium">
                            {order.delivery_address.city}, {order.delivery_address.state}
                          </div>
                          <div className="text-xs text-neutral-500 capitalize">
                            {order.delivery_address.tag}
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        order.status === 'Paid' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'Shipped' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewOrderDetails(order.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
              <p className="text-neutral-600">No orders found</p>
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-neutral-300 px-6 py-4 flex items-center justify-between">
                <h2 className="font-serif text-2xl text-neutral-900">Order Details - #{selectedOrder}</h2>
                <button
                  onClick={closeOrderDetails}
                  className="text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6">
                {loadingOrderDetails ? (
                  <div className="text-center py-12">
                    <div className="text-neutral-600 text-lg">Loading order details...</div>
                  </div>
                ) : orderDetails ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-neutral-50 p-4 rounded">
                        <p className="text-sm text-neutral-600 mb-1">Order ID</p>
                        <p className="font-medium text-neutral-900">#{orderDetails.id}</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded">
                        <p className="text-sm text-neutral-600 mb-1">User ID</p>
                        <p className="font-medium text-neutral-900">{orderDetails.user_id}</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded">
                        <p className="text-sm text-neutral-600 mb-1">Total Price</p>
                        <p className="font-medium text-neutral-900">₹{orderDetails.total_price.toFixed(2)}</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded">
                        <p className="text-sm text-neutral-600 mb-1">Status</p>
                        <span className={`px-2 py-1 text-xs rounded inline-block ${
                          orderDetails.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          orderDetails.status === 'Paid' ? 'bg-blue-100 text-blue-700' :
                          orderDetails.status === 'Shipped' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {orderDetails.status}
                        </span>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded col-span-2">
                        <p className="text-sm text-neutral-600 mb-1">Order Date</p>
                        <p className="font-medium text-neutral-900">
                          {new Date(orderDetails.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Delivery Address Section */}
                    {orderDetails.delivery_address && (
                      <div className="border-t border-neutral-300 pt-6 mb-6">
                        <h3 className="font-serif text-xl text-neutral-900 mb-4">Delivery Address</h3>
                        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">Full Name</p>
                              <p className="font-medium text-neutral-900">{orderDetails.delivery_address.full_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">Phone Number</p>
                              <p className="font-medium text-neutral-900">{orderDetails.delivery_address.phone_number}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-sm text-neutral-600 mb-1">Address</p>
                              <p className="font-medium text-neutral-900">
                                {orderDetails.delivery_address.address_line_1}
                                {orderDetails.delivery_address.address_line_2 && `, ${orderDetails.delivery_address.address_line_2}`}
                              </p>
                            </div>
                            {orderDetails.delivery_address.landmark && (
                              <div>
                                <p className="text-sm text-neutral-600 mb-1">Landmark</p>
                                <p className="font-medium text-neutral-900">{orderDetails.delivery_address.landmark}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">City</p>
                              <p className="font-medium text-neutral-900">{orderDetails.delivery_address.city}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">State</p>
                              <p className="font-medium text-neutral-900">{orderDetails.delivery_address.state}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">Pincode</p>
                              <p className="font-medium text-neutral-900">{orderDetails.delivery_address.pincode}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">Tag</p>
                              <span className="inline-block px-2 py-1 text-xs bg-neutral-200 text-neutral-700 rounded capitalize">
                                {orderDetails.delivery_address.tag}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-neutral-300 pt-6">
                      <h3 className="font-serif text-xl text-neutral-900 mb-4">Order Items</h3>
                      {orderDetails.order_items && orderDetails.order_items.length > 0 ? (
                        <div className="space-y-4">
                          {orderDetails.order_items.map((item) => (
                            <div key={item.id} className="border border-neutral-300 rounded p-4">
                              <div className="flex gap-4">
                                {item.product?.image_url && (
                                  <div className="w-24 h-24 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
                                    <img
                                      src={resolveImageUrl(item.product.image_url)}
                                      alt={item.product.name || 'Product'}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h4 className="font-serif text-lg text-neutral-900 mb-2">
                                    {item.product?.name || `Product ID: ${item.product_id}`}
                                  </h4>
                                  {item.product?.description && (
                                    <p className="text-sm text-neutral-600 mb-2 line-clamp-2">
                                      {item.product.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 text-sm">
                                    <div>
                                      <span className="text-neutral-600">Quantity: </span>
                                      <span className="font-medium text-neutral-900">{item.quantity}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-600">Price per item: </span>
                                      <span className="font-medium text-neutral-900">₹{item.price.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-600">Subtotal: </span>
                                      <span className="font-medium text-neutral-900">
                                        ₹{(item.price * item.quantity).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                  {item.product && (
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                      {item.product.gender && (
                                        <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded capitalize">
                                          {item.product.gender}
                                        </span>
                                      )}
                                      {item.product.category && (
                                        <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded">
                                          {item.product.category}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="mt-3 pt-3 border-t border-neutral-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-xs text-neutral-600">Seller Status: </span>
                                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                                          item.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                                          item.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                          item.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-neutral-100 text-neutral-700'
                                        }`}>
                                          {item.status || 'Pending'}
                                        </span>
                                      </div>
                                      {item.product?.seller_username && (
                                        <div className="text-xs text-neutral-600">
                                          Seller: <span className="font-medium text-neutral-900">{item.product.seller_username}</span>
                                        </div>
                                      )}
                                    </div>
                                    {item.rejection_reason && (
                                      <div className="mt-2 text-xs text-red-600">
                                        Rejection reason: {item.rejection_reason}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-neutral-600">No items found in this order</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-neutral-600">Failed to load order details</p>
                  </div>
                )}
              </div>
              
              <div className="sticky bottom-0 bg-white border-t border-neutral-300 px-6 py-4 flex justify-end">
                <button
                  onClick={closeOrderDetails}
                  className="px-4 py-2 bg-neutral-600 text-white hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


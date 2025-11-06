import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Package, Users, AlertCircle, ShoppingCart, BarChart3, UserCheck } from 'lucide-react';
import Button from '../components/Button';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'sellers', 'products', 'orders', 'users'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const { data } = await API.get('/admin/stats');
        setStats(data);
      } else if (activeTab === 'sellers') {
        const { data } = await API.get('/admin/sellers');
        setSellers(data || []);
      } else if (activeTab === 'products') {
        const { data } = await API.get('/admin/products/pending');
        setPendingProducts(data || []);
      } else if (activeTab === 'orders') {
        const { data } = await API.get('/admin/orders');
        setOrders(data || []);
      } else if (activeTab === 'users') {
        const { data } = await API.get('/admin/users');
        setAllUsers(data || []);
      }
    } catch (err) {
      if (err?.response?.status === 403) {
        alert('Admin access required');
        navigate('/admin/login');
      } else {
        alert('Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSeller = async (userId) => {
    try {
      await API.post(`/admin/sellers/approve/${userId}`);
      alert('Seller approved successfully');
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to approve seller');
    }
  };

  const handleRejectSeller = async (userId) => {
    if (!confirm('Are you sure you want to reject this seller?')) return;
    
    try {
      await API.post(`/admin/sellers/reject/${userId}`);
      alert('Seller rejected');
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to reject seller');
    }
  };

  const handleVerifyProduct = async (productId) => {
    try {
      await API.post(`/admin/products/verify/${productId}`);
      alert('Product verified successfully');
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to verify product');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await API.patch(`/admin/orders/${orderId}/status?status=${encodeURIComponent(newStatus)}`);
      alert('Order status updated successfully');
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to update order status');
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-serif text-4xl text-neutral-900 mb-8">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-neutral-300 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'stats'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Statistics
            </div>
          </button>
          <button
            onClick={() => setActiveTab('sellers')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'sellers'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Sellers ({sellers.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pending Products ({pendingProducts.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Orders ({orders.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              All Users ({allUsers.length})
            </div>
          </button>
        </div>

        {/* Statistics Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-neutral-300 p-6">
              <h3 className="text-sm font-medium text-neutral-600 mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-neutral-900">{stats.total_users}</p>
              <p className="text-xs text-neutral-500 mt-2">
                {stats.total_customers} customers, {stats.total_sellers} sellers
              </p>
            </div>
            <div className="bg-white border border-neutral-300 p-6">
              <h3 className="text-sm font-medium text-neutral-600 mb-2">Total Products</h3>
              <p className="text-3xl font-bold text-neutral-900">{stats.total_products}</p>
              <p className="text-xs text-neutral-500 mt-2">
                {stats.pending_products} pending verification
              </p>
            </div>
            <div className="bg-white border border-neutral-300 p-6">
              <h3 className="text-sm font-medium text-neutral-600 mb-2">Total Orders</h3>
              <p className="text-3xl font-bold text-neutral-900">{stats.total_orders}</p>
              <p className="text-xs text-neutral-500 mt-2">
                {stats.pending_orders} pending
              </p>
            </div>
            <div className="bg-white border border-neutral-300 p-6">
              <h3 className="text-sm font-medium text-neutral-600 mb-2">Total Revenue</h3>
              <p className="text-3xl font-bold text-neutral-900">${stats.total_revenue.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Sellers Tab */}
        {activeTab === 'sellers' && (
          <div className="bg-white border border-neutral-300">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Username</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Phone</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {sellers.map((seller) => (
                    <tr key={seller.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm text-neutral-600">{seller.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">{seller.username}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{seller.email}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{seller.phone || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {seller.is_active ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                              Email Not Verified
                            </span>
                          )}
                          {seller.is_approved ? (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                              Approved
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                              Pending Approval
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {!seller.is_approved && seller.is_active && (
                            <>
                              <button
                                onClick={() => handleApproveSeller(seller.id)}
                                className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectSeller(seller.id)}
                                className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            </>
                          )}
                          {!seller.is_active && (
                            <span className="px-3 py-1 text-sm text-neutral-500 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              Verify Email First
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sellers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-neutral-600">No sellers found</p>
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingProducts.map((product) => (
              <div key={product.id} className="bg-white border border-neutral-300 p-4">
                <div className="aspect-[3/4] bg-neutral-100 mb-4 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      No Image
                    </div>
                  )}
                </div>
                <h3 className="font-serif text-lg mb-2">{product.name}</h3>
                <p className="text-sm text-neutral-600 mb-2 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg font-medium text-neutral-900">${product.price}</p>
                    {product.discounted_price && (
                      <p className="text-sm text-neutral-600 line-through">
                        ${product.discounted_price}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-600">Seller ID: {product.seller_id}</p>
                    {product.gender && (
                      <p className="text-xs text-neutral-600 capitalize">{product.gender}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => handleVerifyProduct(product.id)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verify Product
                </Button>
              </div>
            ))}
            {pendingProducts.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-neutral-600">No pending products</p>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-neutral-300">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Order ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">User ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Total Price</th>
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
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">${order.total_price.toFixed(2)}</td>
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
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="px-3 py-1 text-sm border border-neutral-300 rounded"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-neutral-600">No orders found</p>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white border border-neutral-300">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Username</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Phone</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {allUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm text-neutral-600">{user.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">{user.username}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{user.phone || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded capitalize ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'seller' ? 'bg-blue-100 text-blue-700' :
                          'bg-neutral-100 text-neutral-700'
                        }`}>
                          {user.role || 'customer'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          user.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {user.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {allUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-neutral-600">No users found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


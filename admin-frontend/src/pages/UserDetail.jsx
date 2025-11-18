import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, Trash2, User, Mail, Phone, Calendar, MapPin, Package,
  RefreshCw, AlertTriangle, CheckCircle, XCircle, Eye, Building2, Home
} from 'lucide-react';
import Button from '../components/Button';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentAdmin } = useAuth();
  const [userDetail, setUserDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentAdmin || currentAdmin.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchUserDetail();
  }, [id, currentAdmin, navigate]);

  const fetchUserDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.get(`/admin/users/${id}`);
      setUserDetail(data);
    } catch (err) {
      console.error('Error fetching user detail:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/admin/users/${id}`);
      alert('User deleted successfully');
      navigate('/admin/users');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete user');
      setDeleting(false);
    }
  };

  // Check if this is the current admin's account by comparing username
  const isOwnAccount = userDetail && currentAdmin?.username === userDetail.username;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
          <div className="text-neutral-600 text-lg">Loading user details...</div>
        </div>
      </div>
    );
  }

  if (error || !userDetail) {
    return (
      <div className="min-h-screen bg-neutral-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'User not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Users
            </button>
            <div>
              <h1 className="font-serif text-4xl text-neutral-900 mb-2">User Details</h1>
              <p className="text-neutral-600">View and manage user account</p>
            </div>
          </div>
          {!isOwnAccount && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete User
            </button>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="font-serif text-2xl text-neutral-900 mb-6">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-neutral-500" />
              <div>
                <p className="text-sm text-neutral-600">Username</p>
                <p className="font-medium text-neutral-900">{userDetail.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-neutral-500" />
              <div>
                <p className="text-sm text-neutral-600">Email</p>
                <p className="font-medium text-neutral-900">{userDetail.email}</p>
              </div>
            </div>
            {userDetail.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="text-sm text-neutral-600">Phone</p>
                  <p className="font-medium text-neutral-900">{userDetail.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <span className={`px-2 py-1 text-xs rounded capitalize ${
                  userDetail.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  userDetail.role === 'seller' ? 'bg-blue-100 text-blue-700' :
                  'bg-neutral-100 text-neutral-700'
                }`}>
                  {userDetail.role || 'customer'}
                </span>
              </div>
              <div>
                <p className="text-sm text-neutral-600">Role</p>
                <p className="font-medium text-neutral-900 capitalize">{userDetail.role || 'customer'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                {userDetail.is_active ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-sm text-neutral-600">Status</p>
                <p className="font-medium text-neutral-900">
                  {userDetail.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
            {userDetail.role === 'seller' && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  {userDetail.is_approved ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-neutral-600">Approval Status</p>
                  <p className="font-medium text-neutral-900">
                    {userDetail.is_approved ? 'Approved' : 'Pending Approval'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Addresses Section */}
        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl text-neutral-900 flex items-center gap-2">
              <MapPin className="w-6 h-6" />
              Addresses ({userDetail.addresses?.length || 0})
            </h2>
          </div>
          {userDetail.addresses && userDetail.addresses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userDetail.addresses.map((address) => (
                <div key={address.id} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {address.tag === 'home' ? (
                        <Home className="w-4 h-4 text-neutral-500" />
                      ) : address.tag === 'office' ? (
                        <Building2 className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <MapPin className="w-4 h-4 text-neutral-500" />
                      )}
                      <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded capitalize">
                        {address.tag}
                      </span>
                      {address.is_default && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="font-medium text-neutral-900 mb-1">{address.full_name}</p>
                  <p className="text-sm text-neutral-600 mb-1">{address.phone_number}</p>
                  <p className="text-sm text-neutral-600">
                    {address.address_line_1}
                    {address.address_line_2 && `, ${address.address_line_2}`}
                  </p>
                  {address.landmark && (
                    <p className="text-sm text-neutral-600">Landmark: {address.landmark}</p>
                  )}
                  <p className="text-sm text-neutral-600">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-600 text-center py-8">No addresses found</p>
          )}
        </div>

        {/* Orders Section */}
        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="font-serif text-2xl text-neutral-900 mb-6 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Orders ({userDetail.orders?.length || 0})
          </h2>
          {userDetail.orders && userDetail.orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {userDetail.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">#{order.id}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                        ₹{order.total_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'Paid' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'Shipped' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-neutral-600 text-center py-8">No orders found</p>
          )}
        </div>

        {/* Returns Section */}
        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="font-serif text-2xl text-neutral-900 mb-6 flex items-center gap-2">
            <RefreshCw className="w-6 h-6" />
            Returns ({userDetail.returns?.length || 0})
          </h2>
          {userDetail.returns && userDetail.returns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Return ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {userDetail.returns.map((returnOrder) => (
                    <tr key={returnOrder.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">#{returnOrder.id}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600">#{returnOrder.id}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {new Date(returnOrder.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                        ₹{returnOrder.total_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          returnOrder.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {returnOrder.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-neutral-600 text-center py-8">No returns found</p>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="font-serif text-xl text-neutral-900 mb-4">Delete User</h3>
              <p className="text-neutral-600 mb-6">
                Are you sure you want to delete <strong>{userDetail.username}</strong>? This action is irreversible and will delete:
              </p>
              <ul className="list-disc list-inside text-sm text-neutral-600 mb-6 space-y-1">
                <li>User account</li>
                <li>All addresses</li>
                <li>All orders</li>
                <li>All returns</li>
                <li>Cart and wishlist items</li>
                {userDetail.role === 'seller' && <li>All seller products</li>}
              </ul>
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => setShowDeleteDialog(false)}
                  className="bg-neutral-200 text-neutral-900 hover:bg-neutral-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {deleting ? 'Deleting...' : 'Delete User'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


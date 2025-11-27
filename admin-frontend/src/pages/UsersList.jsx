import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, Search, Filter, Eye, Trash2, UserCheck, ShoppingBag,
  CheckCircle, XCircle, AlertCircle, ArrowLeft, LogOut
} from 'lucide-react';

export default function UsersList() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'customer', 'seller'
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.get('/admin/users');
      setAllUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch users');
      if (err?.response?.status === 403) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    try {
      await API.delete(`/admin/users/${deleteUserId}`);
      alert('User deleted successfully');
      setShowDeleteDialog(false);
      setDeleteUserId(null);
      fetchUsers();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete user');
    }
  };

  const openDeleteDialog = (userId, username) => {
    if (username === user?.username) {
      alert('You cannot delete your own account');
      return;
    }
    setDeleteUserId(userId);
    setShowDeleteDialog(true);
  };

  // Filter users
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const customers = filteredUsers.filter(u => u.role === 'customer' || !u.role);
  const sellers = filteredUsers.filter(u => u.role === 'seller');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
          <div className="text-neutral-600 text-lg">Loading users...</div>
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
            <h1 className="font-serif text-4xl text-neutral-900 mb-2">User Management</h1>
            <p className="text-neutral-600">Manage all customers and sellers</p>
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

        {/* Search and Filter */}
        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-neutral-500" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="all">All Users</option>
                <option value="customer">Customers</option>
                <option value="seller">Sellers</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Customers Section */}
        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="font-serif text-2xl text-neutral-900 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6" />
              Customers ({customers.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            {customers.length > 0 ? (
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Phone</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm text-neutral-600">{customer.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">{customer.username}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{customer.email}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{customer.phone || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          customer.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/admin/users/${customer.id}`)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => openDeleteDialog(customer.id, customer.username)}
                            disabled={customer.username === user?.username}
                            className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                <p className="text-neutral-600">No customers found</p>
              </div>
            )}
          </div>
        </div>

        {/* Sellers Section */}
        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="font-serif text-2xl text-neutral-900 flex items-center gap-2">
              <UserCheck className="w-6 h-6" />
              Sellers ({sellers.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            {sellers.length > 0 ? (
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Phone</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Approval</th>
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
                        <span className={`px-2 py-1 text-xs rounded ${
                          seller.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {seller.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {seller.is_approved ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3" />
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/admin/users/${seller.id}`)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => openDeleteDialog(seller.id, seller.username)}
                            disabled={seller.username === user?.username}
                            className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                <p className="text-neutral-600">No sellers found</p>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="font-serif text-xl text-neutral-900 mb-4">Delete User</h3>
              <p className="text-neutral-600 mb-6">
                Are you sure you want to delete this user? This action is irreversible and will delete all associated data including orders, addresses, and products (if seller).
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteUserId(null);
                  }}
                  className="px-4 py-2 bg-neutral-200 text-neutral-900 hover:bg-neutral-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


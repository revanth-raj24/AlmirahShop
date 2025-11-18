import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Users, CheckCircle, XCircle, AlertCircle, Ban, Eye, Filter, Search, Mail, Phone, Calendar } from 'lucide-react';
import Button from '../components/Button';

export default function AdminSellers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Initialize filter from URL query parameter on mount
  const [statusFilter, setStatusFilter] = useState(() => {
    const filterParam = searchParams.get('filter');
    return filterParam || '';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(null);

  // Sync filter with URL when URL changes (e.g., from navigation)
  useEffect(() => {
    const filterParam = searchParams.get('filter') || '';
    if (filterParam !== statusFilter) {
      setStatusFilter(filterParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchSellers();
  }, [user, navigate, statusFilter]);

  const fetchSellers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.get('/admin/sellers');
      setSellers(data || []);
    } catch (err) {
      console.error('Error fetching sellers:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch sellers');
      if (err?.response?.status === 403) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (sellerId, sellerName) => {
    if (!confirm(`Are you sure you want to approve "${sellerName}"?`)) {
      return;
    }

    setProcessing(sellerId);
    try {
      await API.post(`/admin/sellers/approve/${sellerId}`);
      alert('Seller approved successfully!');
      fetchSellers();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to approve seller');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (sellerId, sellerName) => {
    if (!confirm(`Are you sure you want to reject "${sellerName}"? This will prevent them from selling on the platform.`)) {
      return;
    }

    setProcessing(sellerId);
    try {
      await API.post(`/admin/sellers/reject/${sellerId}`);
      alert('Seller rejected successfully');
      fetchSellers();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to reject seller');
    } finally {
      setProcessing(null);
    }
  };

  const handleBlock = async (sellerId, sellerName) => {
    if (!confirm(`Are you sure you want to block "${sellerName}"? This will deactivate their account.`)) {
      return;
    }

    setProcessing(sellerId);
    try {
      await API.post(`/admin/sellers/block/${sellerId}`);
      alert('Seller blocked successfully');
      fetchSellers();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to block seller');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadges = (seller) => {
    const badges = [];
    
    if (!seller.is_active) {
      badges.push(
        <span key="email" className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Email Not Verified
        </span>
      );
    } else {
      badges.push(
        <span key="active" className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
          Active
        </span>
      );
    }
    
    if (seller.is_approved) {
      badges.push(
        <span key="approved" className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      );
    } else if (seller.is_active) {
      badges.push(
        <span key="pending" className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Pending Approval
        </span>
      );
    }
    
    return badges;
  };

  const filteredSellers = sellers.filter((seller) => {
    // Status filter
    if (statusFilter === 'pending' && (seller.is_approved || !seller.is_active)) return false;
    if (statusFilter === 'approved' && !seller.is_approved) return false;
    if (statusFilter === 'active' && !seller.is_active) return false;
    if (statusFilter === 'inactive' && seller.is_active) return false;
    
    // Search filter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      seller.username.toLowerCase().includes(search) ||
      seller.email.toLowerCase().includes(search) ||
      seller.phone?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
          <div className="text-neutral-600 text-lg">Loading sellers...</div>
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
            <h1 className="font-serif text-4xl text-neutral-900 mb-2">Seller Management</h1>
            <p className="text-neutral-600">Manage all seller accounts and approvals</p>
          </div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors bg-white border border-neutral-300 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-neutral-300 rounded-lg p-4">
            <div className="text-sm text-neutral-600 mb-1">Total Sellers</div>
            <div className="text-2xl font-bold text-neutral-900">{sellers.length}</div>
          </div>
          <div className="bg-white border border-neutral-300 rounded-lg p-4">
            <div className="text-sm text-neutral-600 mb-1">Pending Approval</div>
            <div className="text-2xl font-bold text-yellow-600">
              {sellers.filter(s => !s.is_approved && s.is_active).length}
            </div>
          </div>
          <div className="bg-white border border-neutral-300 rounded-lg p-4">
            <div className="text-sm text-neutral-600 mb-1">Approved</div>
            <div className="text-2xl font-bold text-green-600">
              {sellers.filter(s => s.is_approved).length}
            </div>
          </div>
          <div className="bg-white border border-neutral-300 rounded-lg p-4">
            <div className="text-sm text-neutral-600 mb-1">Email Not Verified</div>
            <div className="text-2xl font-bold text-red-600">
              {sellers.filter(s => !s.is_active).length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-600" />
              <span className="text-sm font-medium text-neutral-700">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  // Update URL query parameter
                  if (e.target.value) {
                    setSearchParams({ filter: e.target.value });
                  } else {
                    setSearchParams({});
                  }
                }}
                className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="">All</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-neutral-600" />
              <input
                type="text"
                placeholder="Search sellers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Sellers Table */}
        {filteredSellers.length > 0 ? (
          <div className="bg-white border border-neutral-300 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Seller</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {filteredSellers.map((seller) => (
                    <tr key={seller.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm text-neutral-600">#{seller.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-900">{seller.username}</div>
                        <div className="text-xs text-neutral-500 mt-1">Role: {seller.role}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-2 text-neutral-900 mb-1">
                            <Mail className="w-3 h-3" />
                            {seller.email}
                          </div>
                          {seller.phone && (
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                              <Phone className="w-3 h-3" />
                              {seller.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {getStatusBadges(seller)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {!seller.is_approved && seller.is_active && (
                            <>
                              <button
                                onClick={() => handleApprove(seller.id, seller.username)}
                                disabled={processing === seller.id}
                                className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 disabled:bg-neutral-400 disabled:cursor-not-allowed rounded flex items-center gap-1 transition-colors"
                                title="Approve Seller"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(seller.id, seller.username)}
                                disabled={processing === seller.id}
                                className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 disabled:bg-neutral-400 disabled:cursor-not-allowed rounded flex items-center gap-1 transition-colors"
                                title="Reject Seller"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            </>
                          )}
                          {seller.is_active && (
                            <button
                              onClick={() => handleBlock(seller.id, seller.username)}
                              disabled={processing === seller.id}
                              className="px-3 py-1 text-sm bg-neutral-600 text-white hover:bg-neutral-700 disabled:bg-neutral-400 disabled:cursor-not-allowed rounded flex items-center gap-1 transition-colors"
                              title="Block Seller"
                            >
                              <Ban className="w-4 h-4" />
                              Block
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/admin/users/${seller.id}`)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
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
            <Users className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
            <h3 className="font-serif text-xl text-neutral-900 mb-2">No Sellers Found</h3>
            <p className="text-neutral-600">
              {searchTerm || statusFilter
                ? 'Try adjusting your filters or search terms.'
                : 'No sellers have registered yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


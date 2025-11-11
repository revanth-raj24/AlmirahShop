import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { resolveImageUrl } from '../utils/imageUtils';
import { Package, Eye, Edit, Trash2, Filter, Search } from 'lucide-react';
import Button from '../components/Button';

export default function AdminProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchProducts();
  }, [user, navigate, statusFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter ? { status_filter: statusFilter } : {};
      const { data } = await API.get('/admin/products', { params });
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch products');
      if (err?.response?.status === 403) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewEdit = (productId) => {
    navigate(`/admin/products/${productId}/edit`);
  };

  const handleDelete = async (productId, productName) => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await API.delete(`/admin/products/${productId}`);
      alert('Product deleted successfully');
      fetchProducts();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete product');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: 'bg-yellow-100 text-yellow-700',
      Approved: 'bg-green-100 text-green-700',
      Rejected: 'bg-red-100 text-red-700',
    };
    return badges[status] || 'bg-neutral-100 text-neutral-700';
  };

  const filteredProducts = products.filter((product) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(search) ||
      product.category?.toLowerCase().includes(search) ||
      product.seller?.username?.toLowerCase().includes(search) ||
      product.seller?.email?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
          <div className="text-neutral-600 text-lg">Loading products...</div>
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
            <h1 className="font-serif text-4xl text-neutral-900 mb-2">All Products</h1>
            <p className="text-neutral-600">Manage all products in the platform</p>
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

        {/* Filters */}
        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-600" />
              <span className="text-sm font-medium text-neutral-700">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-neutral-600" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Products Table */}
        {filteredProducts.length > 0 ? (
          <div className="bg-white border border-neutral-300 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Image</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Product Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Gender</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Seller</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {filteredProducts.map((product) => (
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
                        <div className="text-sm text-neutral-600">
                          {product.category || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-neutral-600 capitalize">
                          {product.gender || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-neutral-900">
                          ${product.price.toFixed(2)}
                        </div>
                        {product.discounted_price && (
                          <div className="text-xs text-neutral-500 line-through">
                            ${product.discounted_price.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-neutral-900">
                            {product.seller?.username || 'N/A'}
                          </div>
                          {product.seller?.email && (
                            <div className="text-xs text-neutral-500">
                              {product.seller.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(product.verification_status)}`}>
                          {product.verification_status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewEdit(product.id)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1 transition-colors"
                            title="View / Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded flex items-center gap-1 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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
            <Package className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
            <h3 className="font-serif text-xl text-neutral-900 mb-2">No Products Found</h3>
            <p className="text-neutral-600">
              {searchTerm || statusFilter
                ? 'Try adjusting your filters or search terms.'
                : 'No products have been added yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


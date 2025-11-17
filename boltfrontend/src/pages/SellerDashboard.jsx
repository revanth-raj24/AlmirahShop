import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Package, ShoppingCart, BarChart3, CheckCircle } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { resolveImageUrl } from '../utils/imageUtils';
import SizeGuideModal from '../components/SizeGuideModal';

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'products', 'orders'
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showSizeGuideModal, setShowSizeGuideModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    price: '',
    discounted_price: '',
    gender: '',
    category: '',
  });
  const [bulkData, setBulkData] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'seller') {
      navigate('/seller/login');
      return;
    }
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const { data } = await API.get('/seller/stats');
        setStats(data);
      } else if (activeTab === 'products') {
        const { data } = await API.get('/seller/products');
        setProducts(data || []);
      } else if (activeTab === 'orders') {
        const { data } = await API.get('/seller/orders');
        setOrders(data || []);
      }
    } catch (err) {
      if (err?.response?.status === 403) {
        if (err?.response?.data?.detail?.includes('not approved')) {
          alert('Your seller account is pending admin approval.');
        } else {
          alert('Seller access required');
        }
        navigate('/seller/login');
      } else {
        alert('Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        discounted_price: formData.discounted_price ? parseFloat(formData.discounted_price) : null,
        gender: formData.gender || null,
        category: formData.category || null,
      };

      if (editingProduct) {
        await API.patch(`/seller/products/update/${editingProduct.id}`, payload);
      } else {
        await API.post('/seller/products/create', payload);
      }

      setShowAddForm(false);
      setEditingProduct(null);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    try {
      const lines = bulkData.split('\n').filter(line => line.trim());
      const products = [];
      
      for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
          products.push({
            name: parts[0],
            price: parseFloat(parts[1]),
            description: parts[2] || '',
            image_url: parts[3] || '',
            discounted_price: parts[4] ? parseFloat(parts[4]) : null,
            gender: parts[5] || null,
            category: parts[6] || null,
          });
        }
      }

      if (products.length === 0) {
        alert('Please provide products in the format: name|price|description|image_url|discounted_price|gender|category');
        return;
      }

      await API.post('/seller/products/bulk', { products });
      setShowBulkForm(false);
      setBulkData('');
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to create products');
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await API.delete(`/seller/products/delete/${productId}`);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      image_url: product.image_url || '',
      price: product.price?.toString() || '',
      discounted_price: product.discounted_price?.toString() || '',
      gender: product.gender || '',
      category: product.category || '',
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      price: '',
      discounted_price: '',
      gender: '',
      category: '',
    });
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
        <h1 className="font-serif text-4xl text-neutral-900 mb-8">Seller Dashboard</h1>

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
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Products ({products.length})
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
        </div>

        {/* Statistics Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-neutral-300 p-6">
              <h3 className="text-sm font-medium text-neutral-600 mb-2">Total Products</h3>
              <p className="text-3xl font-bold text-neutral-900">{stats.total_products}</p>
              <p className="text-xs text-neutral-500 mt-2">
                {stats.verified_products} verified, {stats.pending_products} pending
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

        {/* Products Tab */}
        {activeTab === 'products' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl text-neutral-900">My Products</h2>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowAddForm(true);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Product
                </Button>
                <Button
                  onClick={() => setShowBulkForm(true)}
                  className="flex items-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  Bulk Upload
                </Button>
              </div>
            </div>

            {showAddForm && (
              <div className="bg-white border border-neutral-300 p-6 mb-8">
                <h2 className="font-serif text-2xl mb-4">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Product Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                    <Input
                      label="Price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                    <Input
                      label="Discounted Price (optional)"
                      type="number"
                      step="0.01"
                      value={formData.discounted_price}
                      onChange={(e) => setFormData({ ...formData, discounted_price: e.target.value })}
                    />
                    <Input
                      label="Gender (men/women/unisex)"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    />
                    <Input
                      label="Category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                    <Input
                      label="Image URL"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <div className="bg-neutral-50 border border-dashed border-neutral-300 px-4 py-3 rounded-lg text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-neutral-600">
                      <p className="font-medium text-neutral-900">Need precise measurements?</p>
                      <p>Reference our universal chart before entering size options.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSizeGuideModal(true)}
                      className="text-neutral-900 underline underline-offset-4 font-medium"
                    >
                      View Standard Size Guide
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit">
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingProduct(null);
                        resetForm();
                      }}
                      className="bg-neutral-300 text-neutral-900 hover:bg-neutral-400"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {showBulkForm && (
              <div className="bg-white border border-neutral-300 p-6 mb-8">
                <h2 className="font-serif text-2xl mb-4">Bulk Upload Products</h2>
                <p className="text-sm text-neutral-600 mb-4">
                  Format: name|price|description|image_url|discounted_price|gender|category (one per line)
                </p>
                <div className="bg-neutral-50 border border-dashed border-neutral-300 px-4 py-3 rounded-lg text-sm mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-neutral-600">Unsure about size abbreviations? Stay consistent with our chart.</span>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuideModal(true)}
                    className="text-neutral-900 underline underline-offset-4 font-medium"
                  >
                    View Standard Size Guide
                  </button>
                </div>
                <form onSubmit={handleBulkSubmit} className="space-y-4">
                  <textarea
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-neutral-300 focus:outline-none focus:border-neutral-900"
                    placeholder="Product Name|100|Description|https://image.com/img.jpg|80|men|clothing"
                  />
                  <div className="flex gap-3">
                    <Button type="submit">Upload Products</Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowBulkForm(false);
                        setBulkData('');
                      }}
                      className="bg-neutral-300 text-neutral-900 hover:bg-neutral-400"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const imageUrl = resolveImageUrl(product.image_url);
                return (
                <div key={product.id} className="bg-white border border-neutral-300 p-4">
                  <div className="aspect-[3/4] bg-neutral-100 mb-4 overflow-hidden">
                    {imageUrl ? (
                      <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <h3 className="font-serif text-lg mb-2">{product.name}</h3>
                  <p className="text-sm text-neutral-600 mb-2">${product.price}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      product.is_verified 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {product.is_verified ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        'Pending Verification'
                      )}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="flex-1 px-3 py-2 border border-neutral-300 hover:bg-neutral-100 flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-neutral-600">No products yet. Add your first product!</p>
              </div>
            )}
          </>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-neutral-300">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Order ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Total Price</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm text-neutral-600">#{order.id}</td>
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
      </div>
      <SizeGuideModal open={showSizeGuideModal} onClose={() => setShowSizeGuideModal(false)} />
    </div>
  );
}

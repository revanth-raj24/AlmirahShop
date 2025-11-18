import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Package, ShoppingCart, BarChart3, CheckCircle, LogOut } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { resolveImageUrl } from '../utils/imageUtils';

export default function SellerDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'products', 'orders'
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    price: '',
    discounted_price: '',
    gender: '',
    category: '',
    sizes: '',
    colors: '',
    size_fit: '',
    material_care: '',
    specifications: '',
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [bulkData, setBulkData] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'seller') {
      navigate('/seller/login');
      return;
    }
    fetchData();
    // Always fetch navigation counts regardless of active tab
    fetchNavigationCounts();
  }, [user, activeTab, navigate]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => {
        if (preview.preview && preview.isNew) {
          URL.revokeObjectURL(preview.preview);
        }
      });
    };
  }, []);

  // Fetch counts for navigation bar - always called regardless of active tab
  const fetchNavigationCounts = async () => {
    try {
      // Fetch all counts concurrently
      const [productsRes, ordersRes] = await Promise.all([
        API.get('/seller/products').catch(() => ({ data: [] })),
        API.get('/seller/orders').catch(() => ({ data: { items: [] } }))
      ]);

      setProducts(productsRes.data || []);
      // New endpoint returns paginated response with items array
      setOrders(ordersRes.data?.items || []);
    } catch (err) {
      console.error('Error fetching navigation counts:', err);
      // Don't show alerts for navigation count errors, just log them
    }
  };

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
        // New endpoint returns paginated response with items array
        setOrders(data?.items || []);
      }
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        if (err?.response?.data?.detail?.includes('not approved')) {
          alert('Your seller account is pending admin approval.');
        } else {
          alert('Authentication required. Please login again.');
        }
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        navigate('/seller/login');
      } else {
        console.error('Failed to fetch data:', err);
        alert('Failed to fetch data');
      }
      // Ensure arrays are set to empty on error
      if (activeTab === 'products') {
        setProducts([]);
      } else if (activeTab === 'orders') {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Create previews for new files
    const newPreviews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isNew: true
    }));
    
    // Merge with existing images (if editing)
    const existingPreviews = imagePreviews.filter(p => !p.isNew);
    setImagePreviews([...existingPreviews, ...newPreviews]);
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeImagePreview = (index) => {
    const previewToRemove = imagePreviews[index];
    
    // Clean up object URL if it's a new file
    if (previewToRemove.isNew && previewToRemove.preview) {
      URL.revokeObjectURL(previewToRemove.preview);
    }
    
    // Remove from previews
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    
    // Update selected files (only new files)
    setSelectedFiles(newPreviews.filter(p => p.isNew).map(p => p.file));
    
    // Update existing images (only existing images)
    if (!previewToRemove.isNew && previewToRemove.url) {
      // Find the original URL from existingImages
      const updatedExisting = existingImages.filter(url => {
        const resolved = resolveImageUrl(url);
        return resolved !== previewToRemove.url;
      });
      setExistingImages(updatedExisting);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let imageUrl = formData.image_url || null;
      
      // Upload new images if any
      if (selectedFiles.length > 0) {
        const formDataUpload = new FormData();
        selectedFiles.forEach(file => {
          formDataUpload.append('files', file);
        });
        
        try {
          const uploadResponse = await API.post('/seller/upload', formDataUpload, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          if (uploadResponse.data.urls && uploadResponse.data.urls.length > 0) {
            // Use the first uploaded image as the main image
            imageUrl = uploadResponse.data.urls[0];
          }
        } catch (uploadErr) {
          alert(uploadErr?.response?.data?.detail || 'Failed to upload images');
          setUploading(false);
          return;
        }
      } else if (editingProduct && existingImages.length > 0 && !imageUrl) {
        // If editing and no new images, use existing image
        imageUrl = existingImages[0];
      }

      // Parse sizes and colors - always return arrays (empty if no data)
      const sizesArray = formData.sizes && formData.sizes.trim() 
        ? formData.sizes.split(',').map(s => s.trim()).filter(s => s) 
        : [];
      const colorsArray = formData.colors && formData.colors.trim()
        ? formData.colors.split(',').map(c => c.trim()).filter(c => c)
        : [];
      
      // Parse specifications safely - always return an object (empty if no data)
      let specificationsObj = {};
      if (formData.specifications && formData.specifications.trim()) {
        try {
          const parsed = JSON.parse(formData.specifications);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            specificationsObj = parsed;
          } else {
            console.warn('Specifications must be a JSON object, not an array. Using empty object.');
            specificationsObj = {};
          }
        } catch (e) {
          alert('Invalid JSON format for specifications. Please check your JSON syntax.');
          setUploading(false);
          return;
        }
      }

      // Build payload - ensure all list/dict fields are never null
      const payload = {
        name: formData.name,
        description: formData.description || null,
        image_url: imageUrl,
        price: parseFloat(formData.price),
        discounted_price: formData.discounted_price ? parseFloat(formData.discounted_price) : null,
        gender: formData.gender || null,
        category: formData.category || null,
        sizes: sizesArray, // Always send array (empty if no data)
        colors: colorsArray, // Always send array (empty if no data)
        size_fit: formData.size_fit || null,
        material_care: formData.material_care || null,
        specifications: specificationsObj, // Always send object (empty if no data)
      };

      // Log payload for debugging
      console.log('Submitting product with payload:', {
        ...payload,
        sizes: sizesArray,
        colors: colorsArray,
        specifications: specificationsObj
      });

      if (editingProduct) {
        await API.patch(`/seller/products/update/${editingProduct.id}`, payload);
      } else {
        await API.post('/seller/products/create', payload);
      }

      setShowAddForm(false);
      setEditingProduct(null);
      resetForm();
      fetchData();
      fetchNavigationCounts(); // Refresh navigation counts
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to save product');
    } finally {
      setUploading(false);
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
      fetchNavigationCounts(); // Refresh navigation counts
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to create products');
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await API.delete(`/seller/products/delete/${productId}`);
      fetchData();
      fetchNavigationCounts(); // Refresh navigation counts
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
      sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : (product.sizes || ''),
      colors: Array.isArray(product.colors) ? product.colors.join(', ') : (product.colors || ''),
      size_fit: product.size_fit || '',
      material_care: product.material_care || '',
      specifications: product.specifications ? JSON.stringify(product.specifications, null, 2) : '',
    });
    
    // Set existing images for preview
    if (product.image_url) {
      const imageUrl = resolveImageUrl(product.image_url);
      const existing = [{ url: imageUrl, isNew: false }];
      setExistingImages([product.image_url]);
      setImagePreviews(existing);
    } else {
      setExistingImages([]);
      setImagePreviews([]);
    }
    setSelectedFiles([]);
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
      sizes: '',
      colors: '',
      size_fit: '',
      material_care: '',
      specifications: '',
    });
    setSelectedFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
    // Clean up object URLs
    imagePreviews.forEach(preview => {
      if (preview.preview && preview.isNew) {
        URL.revokeObjectURL(preview.preview);
      }
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/seller/login');
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-4xl text-neutral-900">Seller Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/seller/orders')}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-neutral-900 text-white hover:bg-neutral-800 transition-colors rounded"
            >
              <ShoppingCart className="w-4 h-4" />
              Manage Orders
            </button>
            <span className="text-sm text-neutral-600">Welcome, {user?.username}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

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
              <p className="text-3xl font-bold text-neutral-900">₹{stats.total_revenue.toFixed(2)}</p>
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Product Images (Select multiple images)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="w-full px-4 py-2 border border-neutral-300 focus:outline-none focus:border-neutral-900"
                    />
                    {imagePreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-square bg-neutral-100 rounded overflow-hidden">
                            <img
                              src={preview.preview || preview.url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeImagePreview(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-xs"
                              title="Remove image"
                            >
                              ×
                            </button>
                            {index === 0 && (
                              <div className="absolute bottom-2 left-2 bg-neutral-900 text-white text-xs px-2 py-1 rounded">
                                Main Image
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Sizes (comma-separated, e.g., S, M, L, XL)
                      </label>
                      <input
                        type="text"
                        value={formData.sizes}
                        onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                        className="w-full px-4 py-2 border border-neutral-300 focus:outline-none focus:border-neutral-900"
                        placeholder="S, M, L, XL, XXL"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Colors (comma-separated, e.g., Red, Blue, Black)
                      </label>
                      <input
                        type="text"
                        value={formData.colors}
                        onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                        className="w-full px-4 py-2 border border-neutral-300 focus:outline-none focus:border-neutral-900"
                        placeholder="Red, Blue, Black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Size & Fit
                      </label>
                      <textarea
                        value={formData.size_fit}
                        onChange={(e) => setFormData({ ...formData, size_fit: e.target.value })}
                        className="w-full px-4 py-2 border border-neutral-300 focus:outline-none focus:border-neutral-900"
                        rows={3}
                        placeholder="Size and fit information..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Material & Care
                      </label>
                      <textarea
                        value={formData.material_care}
                        onChange={(e) => setFormData({ ...formData, material_care: e.target.value })}
                        className="w-full px-4 py-2 border border-neutral-300 focus:outline-none focus:border-neutral-900"
                        rows={3}
                        placeholder="Material and care instructions..."
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Specifications (JSON format, e.g., {"{"}"Fabric": "Cotton", "Fit": "Regular"{"}"})
                      </label>
                      <textarea
                        value={formData.specifications}
                        onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                        className="w-full px-4 py-2 border border-neutral-300 focus:outline-none focus:border-neutral-900 font-mono text-sm"
                        rows={4}
                        placeholder='{"Fabric": "Cotton", "Fit": "Regular"}'
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={uploading}>
                      {uploading ? 'Uploading...' : (editingProduct ? 'Update Product' : 'Create Product')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        // Clean up object URLs before resetting
                        imagePreviews.forEach(preview => {
                          if (preview.preview && preview.isNew) {
                            URL.revokeObjectURL(preview.preview);
                          }
                        });
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
                  <p className="text-sm text-neutral-600 mb-2">₹{product.price}</p>
                  <div className="flex flex-col gap-2 mb-4">
                    <span className={`px-2 py-1 text-xs rounded w-fit ${
                      product.verification_status === 'Approved'
                        ? 'bg-green-100 text-green-700' 
                        : product.verification_status === 'Rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {product.verification_status === 'Approved' ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Approved
                        </span>
                      ) : product.verification_status === 'Rejected' ? (
                        <span>Rejected</span>
                      ) : (
                        'Pending Verification'
                      )}
                    </span>
                    {product.verification_notes && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        <strong>Rejection Note:</strong> {product.verification_notes}
                      </div>
                    )}
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
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl text-neutral-900">My Orders</h2>
              <Button
                onClick={() => navigate('/seller/orders')}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                View All Orders
              </Button>
            </div>
            <div className="bg-white border border-neutral-300">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Order ID</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Product</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Customer</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Total</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {Array.isArray(orders) && orders.length > 0 ? (
                      orders.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4 text-sm text-neutral-600">#{item.order_id}</td>
                          <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                            {item.product?.name || `Product #${item.product_id}`}
                            <span className="text-neutral-500 text-xs block">Qty: {item.quantity}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-900">
                            <div>{item.customer_username || 'N/A'}</div>
                            <div className="text-xs text-neutral-500">{item.customer_email || ''}</div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded ${
                              item.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                              item.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                              item.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              item.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                              'bg-neutral-100 text-neutral-700'
                            }`}>
                              {item.status}
                            </span>
                            {item.rejection_reason && (
                              <div className="text-xs text-red-600 mt-1">{item.rejection_reason}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-600">
                            {item.order_ordered_at ? new Date(item.order_ordered_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => navigate(`/seller/orders/${item.id}`)}
                              className="px-3 py-1 text-xs bg-neutral-600 text-white hover:bg-neutral-700 rounded"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-neutral-600">
                          No orders yet.
                          <button
                            onClick={() => navigate('/seller/orders')}
                            className="mt-4 px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 block mx-auto"
                          >
                            View All Orders
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


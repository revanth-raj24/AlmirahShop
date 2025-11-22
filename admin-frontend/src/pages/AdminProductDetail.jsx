import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { resolveImageUrl } from '../utils/imageUtils';
import { ArrowLeft, Save, Plus, Edit, Trash2, X, Package, Upload, CheckCircle, XCircle, Star, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../components/Button';

export default function AdminProductDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    price: '',
    discounted_price: '',
    gender: '',
    category: '',
    stock: '',
    low_stock_threshold: '',
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [variantForm, setVariantForm] = useState({
    size: '',
    color: '',
    image_url: '',
    price: '',
    stock: 0,
  });
  const [variantFile, setVariantFile] = useState(null);
  const [variantImagePreview, setVariantImagePreview] = useState(null);
  const [selectedImageModal, setSelectedImageModal] = useState(null);
  const [updatingPrimary, setUpdatingPrimary] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    if (id) {
      fetchProductDetails();
    }
  }, [user, navigate, id]);

  // Keyboard support for image modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedImageModal || !product?.images) return;

      if (e.key === 'Escape') {
        setSelectedImageModal(null);
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = product.images.findIndex(img => img.id === selectedImageModal.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : product.images.length - 1;
        setSelectedImageModal(product.images[prevIndex]);
      } else if (e.key === 'ArrowRight') {
        const currentIndex = product.images.findIndex(img => img.id === selectedImageModal.id);
        const nextIndex = currentIndex < product.images.length - 1 ? currentIndex + 1 : 0;
        setSelectedImageModal(product.images[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageModal, product]);

  const fetchProductDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.get(`/admin/products/${id}/full`);
      setProduct(data);
      setFormData({
        name: data.name || '',
        description: data.description || '',
        image_url: data.image_url || '',
        price: data.price?.toString() || '',
        discounted_price: data.discounted_price?.toString() || '',
        gender: data.gender || '',
        category: data.category || '',
        stock: data.stock?.toString() || '0',
        low_stock_threshold: data.low_stock_threshold?.toString() || '5',
      });
      // Set image preview from images array or fallback to image_url
      if (data.images && data.images.length > 0) {
        setImagePreview(resolveImageUrl(data.images[0].image_url));
      } else if (data.image_url) {
        setImagePreview(resolveImageUrl(data.image_url));
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch product details');
      if (err?.response?.status === 403) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
  };

  const handleVariantFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setVariantFile(file);
    const preview = URL.createObjectURL(file);
    setVariantImagePreview(preview);
  };

  const handleImageClick = (image) => {
    setSelectedImageModal(image);
  };

  const handleSetPrimary = async (imageId) => {
    if (!confirm('Set this image as the primary image?')) return;
    
    setUpdatingPrimary(true);
    try {
      await API.patch(`/admin/products/${id}/images/${imageId}/set-primary`);
      alert('Primary image updated successfully!');
      fetchProductDetails(); // Refresh to show updated order
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to update primary image');
    } finally {
      setUpdatingPrimary(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      await API.delete(`/admin/products/${id}/images/${imageId}`);
      alert('Image deleted successfully!');
      fetchProductDetails(); // Refresh to show updated images
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete image');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let imageUrl = formData.image_url;
      
      // Upload new image if selected
      if (selectedFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('files', selectedFile);
        
        try {
          const uploadResponse = await API.post('/seller/upload', formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          if (uploadResponse.data.urls && uploadResponse.data.urls.length > 0) {
            imageUrl = uploadResponse.data.urls[0];
          }
        } catch (uploadErr) {
          alert(uploadErr?.response?.data?.detail || 'Failed to upload image');
          setSaving(false);
          return;
        }
      }
      
      // Prepare update payload
      const payload = {
        name: formData.name || undefined,
        description: formData.description || undefined,
        image_url: imageUrl || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        discounted_price: formData.discounted_price ? parseFloat(formData.discounted_price) : undefined,
        gender: formData.gender || undefined,
        category: formData.category || undefined,
        stock: formData.stock ? parseInt(formData.stock) : undefined,
        low_stock_threshold: formData.low_stock_threshold ? parseInt(formData.low_stock_threshold) : undefined,
      };
      
      // Remove undefined values
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      
      await API.patch(`/admin/products/${id}`, payload);
      alert('Product updated successfully!');
      fetchProductDetails();
      setSelectedFile(null);
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async () => {
    if (!variantForm.size && !variantForm.color) {
      alert('Please provide at least size or color');
      return;
    }
    
    try {
      let variantImageUrl = variantForm.image_url;
      
      // Upload variant image if selected
      if (variantFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('files', variantFile);
        
        try {
          const uploadResponse = await API.post('/seller/upload', formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          if (uploadResponse.data.urls && uploadResponse.data.urls.length > 0) {
            variantImageUrl = uploadResponse.data.urls[0];
          }
        } catch (uploadErr) {
          alert(uploadErr?.response?.data?.detail || 'Failed to upload variant image');
          return;
        }
      }
      
      const payload = {
        size: variantForm.size || null,
        color: variantForm.color || null,
        image_url: variantImageUrl || null,
        price: variantForm.price ? parseFloat(variantForm.price) : null,
        stock: parseInt(variantForm.stock) || 0,
      };
      
      await API.post(`/admin/products/${id}/variant`, payload);
      alert('Variant added successfully!');
      fetchProductDetails();
      setShowVariantForm(false);
      setVariantForm({ size: '', color: '', image_url: '', price: '', stock: 0 });
      setVariantFile(null);
      setVariantImagePreview(null);
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to add variant');
    }
  };

  const handleUpdateVariant = async (variantId) => {
    try {
      let variantImageUrl = editingVariant.image_url;
      
      // Upload variant image if selected
      if (variantFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('files', variantFile);
        
        try {
          const uploadResponse = await API.post('/seller/upload', formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          if (uploadResponse.data.urls && uploadResponse.data.urls.length > 0) {
            variantImageUrl = uploadResponse.data.urls[0];
          }
        } catch (uploadErr) {
          alert(uploadErr?.response?.data?.detail || 'Failed to upload variant image');
          return;
        }
      }
      
      const payload = {
        size: editingVariant.size || null,
        color: editingVariant.color || null,
        image_url: variantImageUrl || null,
        price: editingVariant.price ? parseFloat(editingVariant.price) : null,
        stock: parseInt(editingVariant.stock) || 0,
      };
      
      await API.patch(`/admin/products/${id}/variant/${variantId}`, payload);
      alert('Variant updated successfully!');
      fetchProductDetails();
      setEditingVariant(null);
      setVariantFile(null);
      setVariantImagePreview(null);
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to update variant');
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!confirm('Are you sure you want to delete this variant?')) {
      return;
    }
    
    try {
      await API.delete(`/admin/products/${id}/variant/${variantId}`);
      alert('Variant deleted successfully!');
      fetchProductDetails();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete variant');
    }
  };

  const startEditVariant = (variant) => {
    setEditingVariant({
      ...variant,
      price: variant.price?.toString() || '',
      stock: variant.stock?.toString() || '0',
    });
    if (variant.image_url) {
      setVariantImagePreview(resolveImageUrl(variant.image_url));
    }
    setShowVariantForm(true);
  };

  const cancelVariantEdit = () => {
    setEditingVariant(null);
    setShowVariantForm(false);
    setVariantForm({ size: '', color: '', image_url: '', price: '', stock: 0 });
    setVariantFile(null);
    setVariantImagePreview(null);
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this product? It will become visible to customers.')) {
      return;
    }

    setProcessing(true);
    try {
      await API.patch(`/admin/products/${id}/approve`);
      alert('Product approved successfully!');
      fetchProductDetails();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to approve product');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      await API.patch(`/admin/products/${id}/reject`, { notes: rejectNotes });
      alert('Product rejected successfully');
      fetchProductDetails();
      setShowRejectModal(false);
      setRejectNotes('');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to reject product');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
          <div className="text-neutral-600 text-lg">Loading product details...</div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="font-serif text-xl text-neutral-900 mb-2">Product Not Found</h3>
          <p className="text-neutral-600 mb-4">{error || 'The product you are looking for does not exist.'}</p>
          <Button onClick={() => navigate('/admin/products')}>
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/admin/products')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors bg-white border border-neutral-300 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </button>
          <div className="flex items-center gap-3">
            {/* Approve/Reject Buttons */}
            {product.verification_status !== 'Approved' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve Product
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={processing || product.verification_status === 'Rejected'}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                  Reject Product
                </button>
              </>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-8">
          {/* Product Information */}
          <h2 className="font-serif text-2xl text-neutral-900 mb-6">Product Information</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Product Images Gallery */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Product Images {product?.images && product.images.length > 0 && `(${product.images.length})`}
              </label>
              {/* Main Image Display */}
              <div 
                className="aspect-[3/4] bg-neutral-100 rounded-lg overflow-hidden mb-4 border-2 border-dashed border-neutral-300 cursor-pointer group relative"
                onClick={() => {
                  if (product?.images && product.images.length > 0) {
                    handleImageClick(product.images[0]);
                  } else if (product?.image_url) {
                    handleImageClick({ id: 0, image_url: product.image_url, is_primary: true });
                  }
                }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Product"
                    className="w-full h-full object-cover"
                  />
                ) : product?.images && product.images.length > 0 ? (
                  <>
                    <img
                      src={resolveImageUrl(product.images[0].image_url)}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                ) : product?.image_url ? (
                  <>
                    <img
                      src={resolveImageUrl(product.image_url)}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    <Package className="w-16 h-16" />
                  </div>
                )}
              </div>
              
              {/* Image Gallery Thumbnails */}
              {product?.images && product.images.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    All Product Images ({product.images.length})
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {product.images.map((img, index) => (
                      <div key={img.id} className="relative aspect-square bg-neutral-100 rounded overflow-hidden border-2 border-neutral-300 group cursor-pointer">
                        <img
                          src={resolveImageUrl(img.image_url)}
                          alt={`Product image ${index + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onClick={() => handleImageClick(img)}
                        />
                        {img.is_primary && (
                          <div className="absolute top-1 left-1 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Primary
                          </div>
                        )}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageClick(img);
                            }}
                            className="bg-black/50 hover:bg-black/70 text-white p-1 rounded"
                            title="View full size"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            {!img.is_primary && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetPrimary(img.id);
                                }}
                                disabled={updatingPrimary}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-2 py-1 rounded text-xs"
                                title="Set as primary"
                              >
                                Set Primary
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(img.id);
                              }}
                              className="flex-1 bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
                              title="Delete image"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            {/* Product Details Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Discounted Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discounted_price}
                    onChange={(e) => setFormData({ ...formData, discounted_price: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">Select Gender</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Alert when stock falls below this number</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Status
                </label>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-sm rounded ${
                    product.verification_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    product.verification_status === 'Approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {product.verification_status}
                  </span>
                  {product.status && (
                    <span className={`px-3 py-1 text-sm rounded ${
                      product.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' :
                      product.status === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      Stock: {product.status.replace('_', ' ')}
                      {product.stock !== undefined && ` (${product.stock} units)`}
                    </span>
                  )}
                </div>
              </div>

              {product.seller && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Seller
                  </label>
                  <div className="text-sm text-neutral-600">
                    <div className="font-medium">{product.seller.username}</div>
                    <div className="text-xs">{product.seller.email}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Variants Section */}
          <div className="border-t border-neutral-300 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl text-neutral-900">Product Variants</h2>
              {!showVariantForm && (
                <button
                  onClick={() => setShowVariantForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Variant
                </button>
              )}
            </div>

            {/* Variant Form */}
            {showVariantForm && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 mb-6">
                <h3 className="font-medium text-neutral-900 mb-4">
                  {editingVariant ? 'Edit Variant' : 'Add New Variant'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Size
                    </label>
                    <input
                      type="text"
                      value={editingVariant?.size || variantForm.size}
                      onChange={(e) => editingVariant
                        ? setEditingVariant({ ...editingVariant, size: e.target.value })
                        : setVariantForm({ ...variantForm, size: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="e.g., S, M, L"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Color
                    </label>
                    <input
                      type="text"
                      value={editingVariant?.color || variantForm.color}
                      onChange={(e) => editingVariant
                        ? setEditingVariant({ ...editingVariant, color: e.target.value })
                        : setVariantForm({ ...variantForm, color: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="e.g., Red, Blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Variant Price (optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingVariant?.price || variantForm.price}
                      onChange={(e) => editingVariant
                        ? setEditingVariant({ ...editingVariant, price: e.target.value })
                        : setVariantForm({ ...variantForm, price: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="Leave empty to use product price"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Stock
                    </label>
                    <input
                      type="number"
                      value={editingVariant?.stock || variantForm.stock}
                      onChange={(e) => editingVariant
                        ? setEditingVariant({ ...editingVariant, stock: e.target.value })
                        : setVariantForm({ ...variantForm, stock: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      min="0"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Variant Image
                    </label>
                    {variantImagePreview && (
                      <div className="w-32 h-32 mb-2 rounded overflow-hidden border border-neutral-300">
                        <img
                          src={variantImagePreview}
                          alt="Variant"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleVariantFileChange}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => editingVariant
                      ? handleUpdateVariant(editingVariant.id)
                      : handleAddVariant()
                    }
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {editingVariant ? 'Update Variant' : 'Add Variant'}
                  </button>
                  <button
                    onClick={cancelVariantEdit}
                    className="px-4 py-2 bg-neutral-200 text-neutral-900 rounded-lg hover:bg-neutral-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Variants Table */}
            {product.variants && product.variants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-900">Image</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-900">Size</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-900">Color</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-900">Price</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-900">Stock</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {product.variants.map((variant) => (
                      <tr key={variant.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          {variant.image_url ? (
                            <img
                              src={resolveImageUrl(variant.image_url)}
                              alt="Variant"
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-neutral-100 rounded flex items-center justify-center">
                              <Package className="w-6 h-6 text-neutral-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          {variant.size || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          {variant.color || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          {variant.price ? `₹${variant.price.toFixed(2)}` : `₹${product.price.toFixed(2)}`}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          {variant.stock}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditVariant(variant)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVariant(variant.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
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
            ) : (
              <div className="text-center py-8 text-neutral-500">
                No variants added yet. Click "Add Variant" to create one.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="font-serif text-2xl text-neutral-900 mb-4">Reject Product</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Please provide a reason for rejecting this product. This will be visible to the seller.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full h-32 p-3 border border-neutral-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={handleReject}
                disabled={!rejectNotes.trim() || processing}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {processing ? 'Processing...' : 'Confirm Reject'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNotes('');
                }}
                className="px-6 py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-900 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Size Image Modal */}
      {selectedImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImageModal(null)}
        >
          <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors z-10"
              title="Close (ESC)"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image */}
            <img
              src={resolveImageUrl(selectedImageModal.image_url)}
              alt="Product image full size"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image Info and Actions */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-6 py-4 rounded-lg flex items-center gap-4">
              <div className="flex items-center gap-2">
                {selectedImageModal.is_primary && (
                  <div className="flex items-center gap-1 bg-green-600 px-2 py-1 rounded text-xs">
                    <Star className="w-3 h-3 fill-current" />
                    Primary Image
                  </div>
                )}
                <span className="text-sm">
                  Image {product?.images?.findIndex(img => img.id === selectedImageModal.id) + 1} of {product?.images?.length}
                </span>
              </div>
              <div className="flex gap-2">
                {!selectedImageModal.is_primary && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetPrimary(selectedImageModal.id);
                      setSelectedImageModal(null);
                    }}
                    disabled={updatingPrimary}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors"
                  >
                    <Star className="w-4 h-4" />
                    Set as Primary
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this image?')) {
                      handleDeleteImage(selectedImageModal.id);
                      setSelectedImageModal(null);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>

            {/* Navigation Arrows */}
            {product?.images && product.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = product.images.findIndex(img => img.id === selectedImageModal.id);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : product.images.length - 1;
                    setSelectedImageModal(product.images[prevIndex]);
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
                  title="Previous image (←)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = product.images.findIndex(img => img.id === selectedImageModal.id);
                    const nextIndex = currentIndex < product.images.length - 1 ? currentIndex + 1 : 0;
                    setSelectedImageModal(product.images[nextIndex]);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
                  title="Next image (→)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

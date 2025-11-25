import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { ArrowLeft, Save, Plus, Trash2, Package } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUtils';

export default function SellerInventoryEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryItem, setInventoryItem] = useState(null);
  
  // Auto-scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [formData, setFormData] = useState({
    sku: '',
    location: '',
    quantity: 0,
    low_stock_threshold: 5,
  });
  const [variants, setVariants] = useState([]);
  const [logs, setLogs] = useState([]);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);

  useEffect(() => {
    if (id) {
      fetchInventoryItem();
    }
  }, [id]);

  const fetchInventoryItem = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/seller/inventory/${id}`);
      const item = response.data;
      setInventoryItem(item);
      setFormData({
        sku: item.sku || '',
        location: item.location || '',
        quantity: item.quantity || 0,
        low_stock_threshold: item.low_stock_threshold || 5,
      });
      setVariants(item.variants || []);
      setLogs(item.logs || []);
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      alert('Failed to load inventory item');
      navigate('/seller/inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await API.patch(`/seller/inventory/${id}`, {
        quantity: formData.quantity,
        location: formData.location,
        variants: variants.map(v => ({ variant_key: v.variant_key, quantity: v.quantity }))
      });
      alert('Inventory updated successfully');
      navigate('/seller/inventory');
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert(error?.response?.data?.detail || 'Failed to update inventory');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustInventory = async () => {
    if (!adjustmentReason || adjustmentQuantity === 0) {
      alert('Please provide a reason and quantity adjustment');
      return;
    }

    try {
      setSaving(true);
      await API.post(`/seller/inventory/${id}/adjust`, {
        change: adjustmentQuantity,
        reason: adjustmentReason,
      });
      alert('Inventory adjusted successfully');
      setAdjustmentReason('');
      setAdjustmentQuantity(0);
      fetchInventoryItem();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      alert(error?.response?.data?.detail || 'Failed to adjust inventory');
    } finally {
      setSaving(false);
    }
  };

  const handleVariantChange = (index, field, value) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleAddVariant = () => {
    setVariants([...variants, { variant_key: '', quantity: 0 }]);
  };

  const handleRemoveVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  if (!inventoryItem) {
    return null;
  }

  const available = inventoryItem.quantity - inventoryItem.reserved_quantity;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Hero Section - Top of Page */}
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <button
            onClick={() => navigate('/seller/inventory')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-8 h-8" />
            Edit Inventory
          </h1>
        </div>

        {/* Product Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {inventoryItem.product?.image_url && (
              <img
                src={resolveImageUrl(inventoryItem.product.image_url)}
                alt={inventoryItem.product.name}
                className="w-20 h-20 object-cover rounded"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {inventoryItem.product?.name || `Product #${inventoryItem.product_id}`}
              </h2>
              <p className="text-sm text-gray-500">Product ID: {inventoryItem.product_id}</p>
            </div>
          </div>

          {/* Stock Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Quantity</div>
              <div className="text-2xl font-bold text-blue-900">{inventoryItem.quantity}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-yellow-600 font-medium">Reserved</div>
              <div className="text-2xl font-bold text-yellow-900">{inventoryItem.reserved_quantity}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Available</div>
              <div className="text-2xl font-bold text-green-900">{available}</div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Details</h3>
          <div className="space-y-4">
            <Input
              label="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="Product SKU"
            />
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Warehouse location"
            />
            <Input
              label="Low Stock Threshold"
              type="number"
              value={formData.low_stock_threshold}
              onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 0 })}
              placeholder="5"
            />
          </div>
        </div>

        {/* Inventory Adjustment */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjust Inventory</h3>
          <div className="space-y-4">
            <Input
              label="Quantity Change"
              type="number"
              value={adjustmentQuantity}
              onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value) || 0)}
              placeholder="Positive to add, negative to subtract"
            />
            <Input
              label="Reason"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="Reason for adjustment (e.g., 'Stock received', 'Damaged items')"
            />
            <Button onClick={handleAdjustInventory} disabled={saving}>
              Apply Adjustment
            </Button>
          </div>
        </div>

        {/* Variants */}
        {variants.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Variants</h3>
              <Button onClick={handleAddVariant} variant="outline" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Variant
              </Button>
            </div>
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={index} className="flex gap-4 items-end">
                  <Input
                    label="Variant Key"
                    value={variant.variant_key}
                    onChange={(e) => handleVariantChange(index, 'variant_key', e.target.value)}
                    placeholder="e.g., S-Red, M-Blue"
                    className="flex-1"
                  />
                  <Input
                    label="Quantity"
                    type="number"
                    value={variant.quantity}
                    onChange={(e) => handleVariantChange(index, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                  <button
                    onClick={() => handleRemoveVariant(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Log */}
        {logs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h3>
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{log.reason || 'No reason provided'}</span>
                    <span className="text-sm text-gray-500">
                      {log.change > 0 ? '+' : ''}{log.change}
                    </span>
                  </div>
                  {log.actor_username && (
                    <div className="text-xs text-gray-400 mt-1">
                      by {log.actor_username}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
          <Button onClick={() => navigate('/seller/inventory')} variant="secondary">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}


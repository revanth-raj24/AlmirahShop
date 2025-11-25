import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { ArrowLeft, Save, Edit, Package } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUtils';

export default function AdminInventoryDetail() {
  const { seller_id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [seller, setSeller] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    quantity: 0,
    reserved_quantity: 0,
  });

  useEffect(() => {
    if (seller_id) {
      fetchInventory();
    }
  }, [seller_id]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/admin/inventories/${seller_id}`);
      setInventory(response.data.items || []);
      setSeller(response.data.seller || null);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      alert('Failed to load inventory');
      navigate('/admin/inventories');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      quantity: item.quantity || 0,
      reserved_quantity: item.reserved_quantity || 0,
    });
  };

  const handleSave = async () => {
    if (!editingItem) return;

    try {
      setSaving(true);
      await API.patch(`/admin/inventory/${editingItem.id}`, formData);
      alert('Inventory updated successfully');
      setEditingItem(null);
      fetchInventory();
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert(error?.response?.data?.detail || 'Failed to update inventory');
    } finally {
      setSaving(false);
    }
  };

  const handleNotifySeller = async () => {
    if (!confirm('Send low stock notification email to seller?')) return;

    try {
      await API.post(`/admin/inventory/notify?seller_id=${parseInt(seller_id)}`);
      alert('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(error?.response?.data?.detail || 'Failed to send notification');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/inventories')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inventories
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-8 h-8" />
                Seller Inventory
              </h1>
              {seller && (
                <p className="text-gray-600 mt-1">
                  {seller.name || seller.username} ({seller.email})
                </p>
              )}
            </div>
            <Button onClick={handleNotifySeller} variant="outline">
              Notify Seller
            </Button>
          </div>
        </div>

        {/* Edit Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Inventory</h3>
              <div className="space-y-4">
                <Input
                  label="Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                />
                <Input
                  label="Reserved Quantity"
                  type="number"
                  value={formData.reserved_quantity}
                  onChange={(e) => setFormData({ ...formData, reserved_quantity: parseInt(e.target.value) || 0 })}
                />
                <div className="flex gap-4">
                  <Button onClick={handleSave} disabled={saving}>
                    Save
                  </Button>
                  <Button onClick={() => setEditingItem(null)} variant="secondary">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reserved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    const available = item.quantity - item.reserved_quantity;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {item.product?.image_url && (
                              <img
                                src={resolveImageUrl(item.product.image_url)}
                                alt={item.product.name}
                                className="w-12 h-12 object-cover rounded mr-3"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.product?.name || `Product #${item.product_id}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.sku || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.reserved_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {available}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


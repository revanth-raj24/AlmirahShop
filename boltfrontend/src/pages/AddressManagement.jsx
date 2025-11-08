import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import Input from '../components/Input';
import Button from '../components/Button';
import { MapPin, Home, Building2, Tag, Edit, Trash2, Plus, X, Check } from 'lucide-react';

export default function AddressManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    address_line_1: '',
    address_line_2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    tag: 'home',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAddresses();
  }, [user, navigate]);

  const fetchAddresses = async () => {
    try {
      const { data } = await API.get('/profile/addresses');
      setAddresses(data);
    } catch (err) {
      setError('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = () => {
    setFormData({
      full_name: '',
      phone_number: '',
      address_line_1: '',
      address_line_2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      tag: 'home',
    });
    setEditingId(null);
    setShowAddForm(true);
  };

  const handleEdit = (address) => {
    setFormData({
      full_name: address.full_name,
      phone_number: address.phone_number,
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || '',
      landmark: address.landmark || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      tag: address.tag,
    });
    setEditingId(address.id);
    setShowAddForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (editingId) {
        await API.put(`/profile/addresses/${editingId}`, formData);
      } else {
        await API.post('/profile/addresses', formData);
      }
      setShowAddForm(false);
      setEditingId(null);
      fetchAddresses();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    try {
      await API.delete(`/profile/addresses/${id}`);
      fetchAddresses();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await API.post(`/profile/addresses/${id}/set-default`);
      fetchAddresses();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to set default address');
    }
  };

  const getTagIcon = (tag) => {
    switch (tag) {
      case 'home':
        return <Home className="w-5 h-5" />;
      case 'office':
        return <Building2 className="w-5 h-5" />;
      default:
        return <Tag className="w-5 h-5" />;
    }
  };

  const getTagLabel = (tag) => {
    return tag.charAt(0).toUpperCase() + tag.slice(1);
  };

  if (loading && addresses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-600">Loading addresses...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-4xl text-neutral-900 mb-2">My Addresses</h1>
          <p className="text-neutral-600">Manage your delivery addresses</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        {showAddForm && (
          <div className="bg-white border border-neutral-300 rounded-lg p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl text-neutral-900">
                {editingId ? 'Edit Address' : 'Add New Address'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="text-neutral-600 hover:text-neutral-900"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Full Name *
                  </label>
                  <Input
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone Number *
                  </label>
                  <Input
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Address Line 1 *
                </label>
                <Input
                  name="address_line_1"
                  value={formData.address_line_1}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Address Line 2 (Optional)
                </label>
                <Input
                  name="address_line_2"
                  value={formData.address_line_2}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Landmark (Optional)
                </label>
                <Input
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    City *
                  </label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    State *
                  </label>
                  <Input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Pincode *
                  </label>
                  <Input
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Address Type
                </label>
                <select
                  name="tag"
                  value={formData.tag}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900 transition-colors"
                >
                  <option value="home">Home</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {editingId ? 'Update Address' : 'Save Address'}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                  }}
                  className="px-6 py-3 border border-neutral-300 text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="bg-white border border-neutral-300 rounded-lg p-12 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
            <h3 className="font-serif text-xl text-neutral-900 mb-2">No addresses yet</h3>
            <p className="text-neutral-600 mb-6">Add your first delivery address to get started</p>
            <Button onClick={handleAdd}>Add Address</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`bg-white border-2 rounded-lg p-6 shadow-sm ${
                  address.is_default ? 'border-neutral-900' : 'border-neutral-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getTagIcon(address.tag)}
                    <span className="font-medium text-neutral-900 capitalize">
                      {getTagLabel(address.tag)}
                    </span>
                    {address.is_default && (
                      <span className="px-2 py-1 text-xs bg-neutral-900 text-white rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(address)}
                      className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="p-2 text-red-600 hover:text-red-700 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-neutral-700">
                  <p className="font-medium text-neutral-900">{address.full_name}</p>
                  <p>{address.phone_number}</p>
                  <p>{address.address_line_1}</p>
                  {address.address_line_2 && <p>{address.address_line_2}</p>}
                  {address.landmark && <p className="text-neutral-500">Near {address.landmark}</p>}
                  <p>
                    {address.city}, {address.state} {address.pincode}
                  </p>
                </div>

                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="mt-4 text-sm text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Set as Default
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


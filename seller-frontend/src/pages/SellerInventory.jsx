import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { Package, Search, AlertTriangle, Upload, Edit, Plus } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUtils';

export default function SellerInventory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [stats, setStats] = useState({ total: 0, low_stock_count: 0, out_of_stock_count: 0 });

  useEffect(() => {
    fetchInventory();
  }, [search, lowStockOnly]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (lowStockOnly) params.append('low_stock_only', 'true');
      
      const response = await API.get(`/seller/inventory?${params.toString()}`);
      setInventory(response.data.items || []);
      setStats({
        total: response.data.total || 0,
        low_stock_count: response.data.low_stock_count || 0,
        out_of_stock_count: response.data.out_of_stock_count || 0
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      alert('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (item) => {
    const available = item.quantity - item.reserved_quantity;
    if (available <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (available <= 5) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">Loading inventory...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section - Top of Page */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-8 h-8" />
                Inventory Management
              </h1>
              <p className="text-gray-600 mt-1">Manage your product inventory and stock levels</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/seller/inventory/bulk')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Bulk Upload
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Items</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-yellow-600 font-medium">Low Stock</div>
              <div className="text-2xl font-bold text-yellow-900 mt-1">{stats.low_stock_count}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-red-600 font-medium">Out of Stock</div>
              <div className="text-2xl font-bold text-red-900 mt-1">{stats.out_of_stock_count}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by product name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lowStockOnly"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="lowStockOnly" className="text-sm text-gray-700">
                Low Stock Only
              </label>
            </div>
          </div>
        </div>

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
                    Total Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reserved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No inventory items found. Create inventory for your products to get started.
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    const status = getStockStatus(item);
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
                              {item.location && (
                                <div className="text-xs text-gray-500">Location: {item.location}</div>
                              )}
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => navigate(`/seller/inventory/${item.id}/edit`)}
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


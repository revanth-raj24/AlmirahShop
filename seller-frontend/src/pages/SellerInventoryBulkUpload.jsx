import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { ArrowLeft, Upload, FileText, Download } from 'lucide-react';

export default function SellerInventoryBulkUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState('');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvData(event.target.result);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!csvData.trim()) {
      alert('Please provide CSV data or upload a file');
      return;
    }

    try {
      setUploading(true);
      // Parse CSV data
      const lines = csvData.split('\n').filter(line => line.trim());
      const items = [];
      
      for (const line of lines.slice(1)) { // Skip header
        const [product_id, sku, location, quantity, low_stock_threshold] = line.split(',').map(s => s.trim());
        if (product_id && quantity) {
          items.push({
            product_id: parseInt(product_id),
            sku: sku || null,
            location: location || null,
            quantity: parseInt(quantity) || 0,
            low_stock_threshold: low_stock_threshold ? parseInt(low_stock_threshold) : 5,
          });
        }
      }

      if (items.length === 0) {
        alert('No valid inventory items found in CSV');
        return;
      }

      await API.post('/seller/inventory/bulk', { items });
      alert(`Successfully uploaded ${items.length} inventory items`);
      navigate('/seller/inventory');
    } catch (error) {
      console.error('Error uploading inventory:', error);
      alert(error?.response?.data?.detail || 'Failed to upload inventory');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `product_id,sku,location,quantity,low_stock_threshold
1,SKU-001,Warehouse-A,100,5
2,SKU-002,Warehouse-B,50,10`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/seller/inventory')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-8 h-8" />
            Bulk Upload Inventory
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CSV Format</h3>
          <p className="text-gray-600 mb-4">
            Upload a CSV file with the following columns:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <code className="text-sm">
              product_id,sku,location,quantity,low_stock_threshold
            </code>
          </div>
          <div className="flex gap-4">
            <Button onClick={downloadTemplate} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Template
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Paste CSV Data
            </label>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="product_id,sku,location,quantity,low_stock_threshold&#10;1,SKU-001,Warehouse-A,100,5&#10;2,SKU-002,Warehouse-B,50,10"
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={uploading} className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Inventory'}
            </Button>
            <Button onClick={() => navigate('/seller/inventory')} variant="secondary">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


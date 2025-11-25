import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import ImagePreview from '../components/ImagePreview';
import { ArrowLeft, Upload, FileText, CheckCircle, XCircle, Image as ImageIcon, Trash2 } from 'lucide-react';

export default function SellerBulkUploadProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState(null);
  const [products, setProducts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(-1);
  const fileInputRef = useRef(null);
  const imageInputRefs = useRef({});

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setCsvFile(file);
    setUploadResult(null);

    // Parse CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      alert('CSV file must have at least a header row and one data row');
      return;
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Validate required headers
    const requiredHeaders = ['name', 'price'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      alert(`CSV missing required columns: ${missingHeaders.join(', ')}`);
      return;
    }

    // Parse data rows
    const parsedProducts = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const product = {
        rowIndex: i - 1, // 0-based index for display
        name: getValue(values, headers, 'name') || '',
        price: getValue(values, headers, 'price') || '',
        description: getValue(values, headers, 'description') || '',
        discounted_price: getValue(values, headers, 'discounted_price') || '',
        gender: getValue(values, headers, 'gender') || '',
        category: getValue(values, headers, 'category') || '',
        images: [], // Will hold File objects
        imagePreviews: [] // Will hold preview URLs
      };

      // Validate
      product.isValid = validateProduct(product);
      parsedProducts.push(product);
    }

    setProducts(parsedProducts);
  };

  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const getValue = (values, headers, key) => {
    const index = headers.indexOf(key);
    if (index === -1) return '';
    const value = values[index] || '';
    return value.replace(/^"|"$/g, '').trim();
  };

  const validateProduct = (product) => {
    if (!product.name || !product.name.trim()) {
      return { valid: false, error: 'Name is required' };
    }
    
    const price = parseFloat(product.price);
    if (isNaN(price) || price <= 0) {
      return { valid: false, error: 'Price must be a positive number' };
    }

    return { valid: true, error: null };
  };

  const handleImageChange = (rowIndex, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const product = products[rowIndex];
    if (!product) return;

    // Add new images
    const newImages = [...product.images, ...files];
    const newPreviews = [...product.imagePreviews];

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newPreviews.push({ file, preview, isNew: true });
      }
    });

    setProducts(prev => prev.map((p, idx) => 
      idx === rowIndex 
        ? { ...p, images: newImages, imagePreviews: newPreviews }
        : p
    ));
  };

  const removeImage = (rowIndex, imageIndex) => {
    setProducts(prev => prev.map((p, idx) => {
      if (idx !== rowIndex) return p;
      
      const newImages = [...p.images];
      const newPreviews = [...p.imagePreviews];
      
      // Revoke object URL if it's a preview
      if (newPreviews[imageIndex]?.isNew) {
        URL.revokeObjectURL(newPreviews[imageIndex].preview);
      }
      
      newImages.splice(imageIndex, 1);
      newPreviews.splice(imageIndex, 1);
      
      return { ...p, images: newImages, imagePreviews: newPreviews };
    }));
  };

  const handleSubmit = async () => {
    if (products.length === 0) {
      alert('Please upload a CSV file first');
      return;
    }

    // Check if all products are valid
    const invalidProducts = products.filter(p => !p.isValid?.valid);
    if (invalidProducts.length > 0) {
      alert(`Please fix ${invalidProducts.length} invalid product(s) before submitting`);
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('csv_file', csvFile);

      // Add images for each row
      products.forEach((product, rowIndex) => {
        product.images.forEach((imageFile, imgIndex) => {
          formData.append(`images_${rowIndex}`, imageFile);
        });
      });

      const response = await API.post('/seller/products/bulk-upload-with-images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data);
      
      if (response.data.success.length > 0) {
        alert(`Successfully created ${response.data.success.length} product(s)!`);
        // Clear form
        setCsvFile(null);
        setProducts([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

      if (response.data.failed.length > 0) {
        const failedMessages = response.data.failed.map(f => `Row ${f.row}: ${f.error}`).join('\n');
        alert(`Some products failed:\n${failedMessages}`);
      }
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to upload products');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `name,price,description,discounted_price,gender,category
"Formal Shirt",899,"Cotton slim fit",799,"men","tops"
"T-Shirt Blue",499,"",399,"men","tops"
"Women Kurti",1299,"Designer kurti","","women","ethnic"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_bulk_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/seller/dashboard')}
              className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-serif font-bold text-neutral-800">Bulk Upload Products</h1>
          </div>
          <Button onClick={downloadTemplate} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* CSV Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. Upload CSV File</h2>
          <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="w-12 h-12 text-neutral-400" />
              <span className="text-neutral-600">
                {csvFile ? csvFile.name : 'Click to upload CSV file'}
              </span>
              <span className="text-sm text-neutral-500">
                CSV format: name,price,description,discounted_price,gender,category
              </span>
            </label>
          </div>
        </div>

        {/* Products Preview Section */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                2. Review & Add Images ({products.length} products)
              </h2>
              <div className="flex gap-2">
                <span className="text-sm text-green-600">
                  ✓ {products.filter(p => p.isValid?.valid).length} valid
                </span>
                <span className="text-sm text-red-600">
                  ✗ {products.filter(p => !p.isValid?.valid).length} invalid
                </span>
              </div>
            </div>

            <div className="space-y-6">
              {products.map((product, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 ${
                    product.isValid?.valid
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {product.isValid?.valid ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-semibold">Row {product.rowIndex + 2}</span>
                      {!product.isValid?.valid && (
                        <span className="text-sm text-red-600">({product.isValid?.error})</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-neutral-500">Name</label>
                      <div className="font-medium">{product.name || '-'}</div>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500">Price</label>
                      <div className="font-medium">₹{product.price || '-'}</div>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500">Discounted</label>
                      <div className="font-medium">
                        {product.discounted_price ? `₹${product.discounted_price}` : '-'}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500">Gender</label>
                      <div className="font-medium">{product.gender || '-'}</div>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500">Category</label>
                      <div className="font-medium">{product.category || '-'}</div>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500">Description</label>
                      <div className="font-medium text-sm truncate" title={product.description}>
                        {product.description || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Product Images</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {product.imagePreviews.map((preview, imgIdx) => (
                        <div key={imgIdx} className="relative">
                          <img
                            src={preview.preview}
                            alt={`Preview ${imgIdx + 1}`}
                            className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              const allPreviews = product.imagePreviews.map(p => p.preview);
                              setPreviewImages(allPreviews);
                              setPreviewIndex(imgIdx);
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(idx, imgIdx);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          {imgIdx === 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-xs text-center py-0.5">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageChange(idx, e)}
                      className="hidden"
                      id={`image-upload-${idx}`}
                      ref={(el) => {
                        if (el) imageInputRefs.current[idx] = el;
                      }}
                    />
                    <label
                      htmlFor={`image-upload-${idx}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer text-sm"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Add Images
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Section */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">3. Submit</h2>
            <Button
              onClick={handleSubmit}
              disabled={uploading || products.some(p => !p.isValid?.valid)}
              className="w-full"
            >
              {uploading ? 'Uploading...' : `Upload ${products.filter(p => p.isValid?.valid).length} Products`}
            </Button>
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Upload Results</h2>
            <div className="space-y-2">
              <div className="text-green-600">
                ✓ Successfully created {uploadResult.success.length} product(s)
              </div>
              {uploadResult.failed.length > 0 && (
                <div>
                  <div className="text-red-600 mb-2">
                    ✗ Failed to create {uploadResult.failed.length} product(s):
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-neutral-600">
                    {uploadResult.failed.map((failure, idx) => (
                      <li key={idx}>
                        Row {failure.row}: {failure.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Image Preview Modal */}
      {previewIndex >= 0 && (
        <ImagePreview
          images={previewImages}
          currentIndex={previewIndex}
          onClose={() => {
            setPreviewIndex(-1);
            setPreviewImages([]);
          }}
        />
      )}
    </div>
  );
}


import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  ExclamationTriangleIcon,
  CubeIcon,
  TagIcon,
  CurrencyDollarIcon,
  QrCodeIcon,
  PlusIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import BarcodeScanner from '../components/BarcodeScanner';

const Products = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeSearching, setBarcodeSearching] = useState(false);

  const { data, isLoading } = useQuery(
    ['products', search, categoryFilter], 
    () => api.getProducts({ search, category: categoryFilter }), 
    { keepPreviousData: true }
  );

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  const watchTrackInventory = watch('trackInventory', true);
  const watchGstApplicable = watch('gstApplicable', true);
  const watchPackagingType = watch('packagingType');
  const watchPackagingQuantity = watch('packagingQuantity', 1);

  const createMutation = useMutation((payload) => api.createProduct(payload), {
    onSuccess: () => {
      toast.success('Product created');
      queryClient.invalidateQueries('products');
      setShowForm(false);
      reset();
    },
    onError: () => toast.error('Failed to create product')
  });

  const updateMutation = useMutation(({ id, payload }) => api.updateProduct(id, payload), {
    onSuccess: () => {
      toast.success('Product updated');
      queryClient.invalidateQueries('products');
      setShowForm(false);
      setEditing(null);
      reset();
    },
    onError: () => toast.error('Failed to update product')
  });

  const deleteMutation = useMutation((id) => api.deleteProduct(id), {
    onSuccess: () => {
      toast.success('Product deleted');
      queryClient.invalidateQueries('products');
    },
    onError: () => toast.error('Failed to delete product')
  });

  const onSubmit = (form) => {
    const payload = {
      name: form.name,
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      description: form.description || undefined,
      category: form.category || undefined,
      unitPrice: parseFloat(form.unitPrice) || 0,
      costPrice: parseFloat(form.costPrice) || 0,
      trackInventory: form.trackInventory || false,
      stockQuantity: form.trackInventory ? parseInt(form.stockQuantity) || 0 : 0,
      lowStockThreshold: form.trackInventory ? parseInt(form.lowStockThreshold) || 0 : 0,
      unit: form.unit || 'pcs',
      taxable: form.taxable || false,
      gstApplicable: form.gstApplicable || false,
      gstRate: form.gstApplicable ? parseFloat(form.gstRate) || 0 : 0,
      packagingType: form.packagingType || undefined,
      packagingQuantity: parseInt(form.packagingQuantity) || 1,
      pricePerUnit: form.packagingQuantity > 1 ? parseFloat(form.unitPrice) / parseInt(form.packagingQuantity) : parseFloat(form.unitPrice),
    };
    
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const onEdit = (product) => {
    setEditing(product);
    reset({
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      description: product.description || '',
      category: product.category || '',
      unitPrice: product.unitPrice || 0,
      costPrice: product.costPrice || 0,
      trackInventory: product.trackInventory || false,
      stockQuantity: product.stockQuantity || 0,
      lowStockThreshold: product.lowStockThreshold || 0,
      unit: product.unit || 'pcs',
      taxable: product.taxable || false,
      gstApplicable: product.gstApplicable !== undefined ? product.gstApplicable : true,
      gstRate: product.gstRate || 0,
      packagingType: product.packagingType || '',
      packagingQuantity: product.packagingQuantity || 1,
    });
    setShowForm(true);
  };

  const onAdd = () => {
    setEditing(null);
    reset({
      name: '',
      sku: '',
      barcode: '',
      description: '',
      category: '',
      unitPrice: 0,
      costPrice: 0,
      trackInventory: true,
      stockQuantity: 0,
      lowStockThreshold: 5,
      unit: 'pcs',
      taxable: true,
      gstApplicable: true,
      gstRate: 8.0,
      packagingType: 'piece',
      packagingQuantity: 1,
    });
    setShowForm(true);
  };

  const isLowStock = (product) => {
    return product.trackInventory && product.stockQuantity <= product.lowStockThreshold;
  };

  // Barcode functionality
  const handleBarcodeScanned = async (barcode) => {
    setBarcodeSearching(true);
    try {
      // First, try to find existing product by barcode
      const existingProducts = await api.getProducts({ search: barcode });
      const existingProduct = existingProducts?.data?.find(p => p.barcode === barcode);
      
      if (existingProduct) {
        // Product found, edit it
        onEdit(existingProduct);
        toast.success(`Found existing product: ${existingProduct.name}`);
      } else {
        // Product not found, create new one with barcode
        setEditing(null);
        reset({
          name: '',
          sku: '',
          barcode: barcode,
          description: '',
          category: '',
          unitPrice: 0,
          costPrice: 0,
          trackInventory: true,
          stockQuantity: 0,
          lowStockThreshold: 5,
          unit: 'pcs',
          taxable: true,
          gstApplicable: true,
          gstRate: 8.0,
          packagingType: 'piece',
          packagingQuantity: 1,
        });
        setShowForm(true);
        toast.info(`New product with barcode: ${barcode}`);
      }
    } catch (error) {
      toast.error('Failed to search for product');
    } finally {
      setBarcodeSearching(false);
      setShowBarcodeScanner(false);
    }
  };

  const products = data?.data?.products || data?.data || [];
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const lowStockCount = products.filter(isLowStock).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products & Inventory</h1>
          <p className="text-gray-600">
            Manage your product catalog • {products.length} products
            {lowStockCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                {lowStockCount} low stock
              </span>
            )}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowBarcodeScanner(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center space-x-2"
          >
            <QrCodeIcon className="h-5 w-5" />
            <span>Scan Barcode</span>
          </button>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, SKU, or description..."
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-48" />
          ))
        ) : products.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new product.</p>
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                    {product.sku && <span>SKU: {product.sku}</span>}
                    {product.barcode && <span>•</span>}
                    {product.barcode && <span>Barcode: {product.barcode}</span>}
                  </div>
                  <div className="flex items-center space-x-1 mt-2">
                    {product.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <TagIcon className="w-3 h-3 mr-1" />
                        {product.category}
                      </span>
                    )}
                    {product.packagingType && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {product.packagingQuantity} {product.packagingType}{product.packagingQuantity > 1 ? 's' : ''}
                      </span>
                    )}
                    {product.gstApplicable && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        GST {product.gstRate}%
                      </span>
                    )}
                  </div>
                </div>
                {isLowStock(product) && (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {product.packagingQuantity > 1 ? `Price (${product.packagingQuantity} ${product.packagingType || 'units'}):` : 'Price:'}
                  </span>
                  <span className="font-medium">${(product.price || product.unitPrice || 0).toFixed(2)}</span>
                </div>
                {product.packagingQuantity > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Per unit:</span>
                    <span className="text-sm font-medium text-gray-700">
                      ${(product.pricePerUnit || (product.price || product.unitPrice || 0) / product.packagingQuantity).toFixed(2)}
                    </span>
                  </div>
                )}
                {product.trackInventory && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Stock:</span>
                    <span className={`font-medium ${
                      isLowStock(product) ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {product.stockQuantity} {product.unit}
                    </span>
                  </div>
                )}
                {product.costPrice > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Margin:</span>
                    <span className="text-sm font-medium text-green-600">
                      {((product.unitPrice - product.costPrice) / product.unitPrice * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between text-sm">
                <button 
                  onClick={() => onEdit(product)} 
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  Edit
                </button>
                <button 
                  onClick={() => deleteMutation.mutate(product.id)} 
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editing ? 'Edit Product' : 'New Product'}</h2>
                <button 
                  onClick={() => { setShowForm(false); setEditing(null); }} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="Product name"
                  />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <input
                    {...register('sku')}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="Stock keeping unit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Barcode</label>
                <div className="flex space-x-2">
                  <input
                    {...register('barcode')}
                    className="mt-1 flex-1 px-3 py-2 border rounded-md"
                    placeholder="Product barcode"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="mt-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                  >
                    <QrCodeIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  placeholder="Product description"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    {...register('category')}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., Electronics, Clothing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <select {...register('unit')} className="mt-1 w-full px-3 py-2 border rounded-md">
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="lbs">Pounds</option>
                    <option value="hrs">Hours</option>
                    <option value="set">Set</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>

              {/* Packaging Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Packaging Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Packaging Type</label>
                    <select {...register('packagingType')} className="mt-1 w-full px-3 py-2 border rounded-md">
                      <option value="">Select packaging</option>
                      <option value="piece">Piece</option>
                      <option value="jar">Jar</option>
                      <option value="bottle">Bottle</option>
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                      <option value="bag">Bag</option>
                      <option value="carton">Carton</option>
                      <option value="container">Container</option>
                      <option value="tube">Tube</option>
                      <option value="sachet">Sachet</option>
                      <option value="pouch">Pouch</option>
                      <option value="set">Set</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity per Package</label>
                    <input
                      {...register('packagingQuantity', { min: 1 })}
                      type="number"
                      min="1"
                      className="mt-1 w-full px-3 py-2 border rounded-md"
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., "2" for 2 jars, "6" for 6-pack bottles
                    </p>
                  </div>
                </div>
                {watchPackagingQuantity > 1 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Price per unit:</strong> ${((watch('unitPrice') || 0) / (watchPackagingQuantity || 1)).toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Your selling price will be for {watchPackagingQuantity} {watchPackagingType || 'units'}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Selling Price *</label>
                  <div className="mt-1 relative">
                    <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('unitPrice', { required: 'Price is required', min: 0 })}
                      type="number"
                      step="0.01"
                      className="w-full pl-10 pr-3 py-2 border rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.unitPrice && <p className="text-sm text-red-600 mt-1">{errors.unitPrice.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost Price</label>
                  <div className="mt-1 relative">
                    <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('costPrice')}
                      type="number"
                      step="0.01"
                      className="w-full pl-10 pr-3 py-2 border rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    {...register('trackInventory')}
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                  />
                  <label className="ml-2 text-sm text-gray-700">Track inventory for this product</label>
                </div>
                
                {watchTrackInventory && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                      <input
                        {...register('stockQuantity')}
                        type="number"
                        className="mt-1 w-full px-3 py-2 border rounded-md"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Low Stock Alert</label>
                      <input
                        {...register('lowStockThreshold')}
                        type="number"
                        className="mt-1 w-full px-3 py-2 border rounded-md"
                        placeholder="5"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center">
                  <input
                    {...register('taxable')}
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                  />
                  <label className="ml-2 text-sm text-gray-700">Taxable product</label>
                </div>

                {/* GST Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">GST/Tax Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        {...register('gstApplicable')}
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                      />
                      <label className="ml-2 text-sm text-gray-700">GST applicable on this product</label>
                    </div>
                    
                    {watchGstApplicable && (
                      <div className="pl-6">
                        <div className="w-32">
                          <label className="block text-sm font-medium text-gray-700">GST Rate (%)</label>
                          <input
                            {...register('gstRate', { min: 0, max: 100 })}
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="mt-1 w-full px-3 py-2 border rounded-md"
                            placeholder="8.00"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => { setShowForm(false); setEditing(null); }} 
                  className="px-4 py-2 rounded-md border hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {editing ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onClose={() => setShowBarcodeScanner(false)}
          onBarcodeScanned={handleBarcodeScanned}
          loading={barcodeSearching}
        />
      )}
    </div>
  );
};

export default Products;

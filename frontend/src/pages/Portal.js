import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

const Portal = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [documentType, setDocumentType] = useState('quote');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState('');
  
  const { user } = useAuth();
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm();
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    fetchCompanyInfo();
    fetchProducts();
    fetchCustomers();
    if (activeTab === 'list') {
      fetchDocuments();
    }
  }, [activeTab]);

  const fetchCompanyInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/portal/company-info', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/portal/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        // Flatten categorized products
        const allProducts = Object.values(data.products).flat();
        setProducts(allProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/portal/customers?search=${searchCustomer}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/portal/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const addProductToCart = (product) => {
    const existingItem = cartItems.find(item => item.productId === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        productId: product.id,
        name: product.name,
        unitPrice: parseFloat(product.price),
        quantity: 1,
        description: product.description
      }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const updateCartItem = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(cartItems.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.productId !== productId));
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const onSubmit = async (data) => {
    if (cartItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/portal/create-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: documentType,
          customerId: data.customerId,
          items: cartItems,
          notes: data.notes,
          templateId: data.templateId,
          dueDate: data.dueDate
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message);
        reset();
        setCartItems([]);
        setActiveTab('list');
      } else {
        toast.error(result.error || 'Failed to create document');
      }
    } catch (error) {
      toast.error('An error occurred while creating the document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Internal Portal</h1>
        <p className="text-gray-600">Create quotations and invoices for customers</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PlusIcon className="w-5 h-5 inline-block mr-2" />
            Create Document
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'list'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClipboardDocumentListIcon className="w-5 h-5 inline-block mr-2" />
            Documents List
          </button>
        </nav>
      </div>

      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Form */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Document Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="quote"
                      checked={documentType === 'quote'}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="mr-2"
                    />
                    <DocumentTextIcon className="w-5 h-5 mr-1" />
                    Quotation
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="invoice"
                      checked={documentType === 'invoice'}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="mr-2"
                    />
                    <ClipboardDocumentListIcon className="w-5 h-5 mr-1" />
                    Invoice
                  </label>
                </div>
              </div>

              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <select
                  {...register('customerId', { required: 'Please select a customer' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select a customer...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.email}
                    </option>
                  ))}
                </select>
                {errors.customerId && (
                  <p className="text-red-600 text-sm mt-1">{errors.customerId.message}</p>
                )}
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template (Optional)
                </label>
                <select
                  {...register('templateId')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Use default template</option>
                  {templates
                    .filter(t => t.type === documentType)
                    .map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  {...register('dueDate')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || cartItems.length === 0}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : `Create ${documentType === 'quote' ? 'Quotation' : 'Invoice'}`}
              </button>
            </form>
          </div>

          {/* Product Selection & Cart */}
          <div className="space-y-6">
            {/* Products */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Products</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {products.map(product => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">${parseFloat(product.price).toFixed(2)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addProductToCart(product)}
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Cart ({cartItems.length} items)
              </h3>
              {cartItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No items in cart</p>
              ) : (
                <div className="space-y-2">
                  {cartItems.map(item => (
                    <div key={item.productId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          ${item.unitPrice.toFixed(2)} × {item.quantity} = ${(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateCartItem(item.productId, parseInt(e.target.value) || 1)}
                          className="w-16 text-center text-xs border border-gray-300 rounded px-1 py-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-medium">
                      <span>Subtotal:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Documents</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          doc.type === 'quote' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {doc.type === 'quote' ? 'Quote' : 'Invoice'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.Customer?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          doc.status === 'paid' ? 'bg-green-100 text-green-800' :
                          doc.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          doc.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${parseFloat(doc.total || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {documents.length === 0 && (
                <p className="text-center text-gray-500 py-8">No documents found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portal;

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  PaperAirplaneIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

const Invoices = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [filters, setFilters] = useState({ status: '', search: '' });

  const { data: invoicesData, isLoading } = useQuery(
    ['invoices', filters], 
    () => api.getInvoices(filters), 
    { keepPreviousData: true }
  );

  const { data: customersData } = useQuery('customers', () => api.getCustomers());
  const { data: productsData } = useQuery('products', () => api.getProducts());

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      items: [{ productId: '', quantity: 1, unitPrice: 0, description: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const watchedCustomer = watch('customerId');

  const createMutation = useMutation((payload) => api.createInvoice(payload), {
    onSuccess: () => {
      toast.success('Invoice created');
      queryClient.invalidateQueries('invoices');
      setShowForm(false);
      reset();
    },
    onError: () => toast.error('Failed to create invoice')
  });

  const updateMutation = useMutation(({ id, payload }) => api.updateInvoice(id, payload), {
    onSuccess: () => {
      toast.success('Invoice updated');
      queryClient.invalidateQueries('invoices');
      setShowForm(false);
      setEditing(null);
      reset();
    },
    onError: () => toast.error('Failed to update invoice')
  });

  const deleteMutation = useMutation((id) => api.deleteInvoice(id), {
    onSuccess: () => {
      toast.success('Invoice deleted');
      queryClient.invalidateQueries('invoices');
    },
    onError: () => toast.error('Failed to delete invoice')
  });

  const sendEmailMutation = useMutation(({ id, email }) => api.sendInvoiceEmail(id, email), {
    onSuccess: () => toast.success('Invoice sent via email'),
    onError: () => toast.error('Failed to send email')
  });

  const customers = customersData?.data?.customers || customersData?.data || [];
  const products = productsData?.data?.products || productsData?.data || [];
  const invoices = invoicesData?.data?.invoices || invoicesData?.data || [];

  const calculateItemTotal = (item) => {
    return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
  };

  const calculateSubtotal = () => {
    return watchedItems?.reduce((sum, item) => sum + calculateItemTotal(item), 0) || 0;
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax rate
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const onProductSelect = (index, productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue(`items.${index}.unitPrice`, product.unitPrice);
      setValue(`items.${index}.description`, product.name);
    }
  };

  const onSubmit = (form) => {
    const payload = {
      customerId: form.customerId,
      invoiceNumber: form.invoiceNumber,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      status: form.status || 'draft',
      notes: form.notes,
      items: form.items.map(item => ({
        productId: item.productId || null,
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        total: calculateItemTotal(item)
      })),
      subtotal: calculateSubtotal(),
      taxAmount: calculateTax(),
      total: calculateTotal()
    };
    
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const onEdit = (invoice) => {
    setEditing(invoice);
    reset({
      customerId: invoice.customerId || '',
      invoiceNumber: invoice.invoiceNumber || '',
      issueDate: invoice.issueDate ? invoice.issueDate.split('T')[0] : '',
      dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
      status: invoice.status || 'draft',
      notes: invoice.notes || '',
      items: invoice.items?.length ? invoice.items : [{ productId: '', quantity: 1, unitPrice: 0, description: '' }]
    });
    setShowForm(true);
  };

  const onAdd = () => {
    setEditing(null);
    const nextInvoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    reset({
      customerId: '',
      invoiceNumber: nextInvoiceNumber,
      issueDate: today,
      dueDate: dueDate,
      status: 'draft',
      notes: '',
      items: [{ productId: '', quantity: 1, unitPrice: 0, description: '' }]
    });
    setShowForm(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'sent':
        return <PaperAirplaneIcon className="w-4 h-4 text-blue-500" />;
      case 'overdue':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const downloadPdf = async (invoiceId) => {
    try {
      const response = await api.downloadInvoicePdf(invoiceId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      link.click();
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Create and manage invoices • {invoices.length} total</p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          placeholder="Search by invoice number or customer..."
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr><td className="px-6 py-4" colSpan={6}>Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td className="px-6 py-12 text-center text-gray-500" colSpan={6}>
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p>No invoices found</p>
                  <p className="text-sm">Create your first invoice to get started</p>
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const customer = customers.find(c => c.id === invoice.customerId);
                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                        <div className="text-sm text-gray-500">{new Date(invoice.issueDate).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{customer?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">${invoice.total?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1">{invoice.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm space-x-2">
                      <button 
                        onClick={() => setSelectedInvoice(invoice)} 
                        className="text-gray-600 hover:text-gray-900"
                        title="View"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onEdit(invoice)} 
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => downloadPdf(invoice.id)} 
                        className="text-green-600 hover:text-green-900"
                        title="Download PDF"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteMutation.mutate(invoice.id)} 
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editing ? 'Edit Invoice' : 'New Invoice'}</h2>
                <button 
                  onClick={() => { setShowForm(false); setEditing(null); }} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer *</label>
                  <select
                    {...register('customerId', { required: 'Customer is required' })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select customer...</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                  {errors.customerId && <p className="text-sm text-red-600 mt-1">{errors.customerId.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Number *</label>
                  <input
                    {...register('invoiceNumber', { required: 'Invoice number is required' })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="INV-001"
                  />
                  {errors.invoiceNumber && <p className="text-sm text-red-600 mt-1">{errors.invoiceNumber.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Issue Date *</label>
                  <input
                    {...register('issueDate', { required: 'Issue date is required' })}
                    type="date"
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date *</label>
                  <input
                    {...register('dueDate', { required: 'Due date is required' })}
                    type="date"
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select {...register('status')} className="mt-1 w-full px-3 py-2 border rounded-md">
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Items</h3>
                  <button
                    type="button"
                    onClick={() => append({ productId: '', quantity: 1, unitPrice: 0, description: '' })}
                    className="text-indigo-600 hover:text-indigo-900 flex items-center"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Item
                  </button>
                </div>
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                      <div className="col-span-12 md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700">Product</label>
                        <select
                          {...register(`items.${index}.productId`)}
                          onChange={(e) => onProductSelect(index, e.target.value)}
                          className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="">Select product...</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <input
                          {...register(`items.${index}.description`)}
                          className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="Item description"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Qty</label>
                        <input
                          {...register(`items.${index}.quantity`)}
                          type="number"
                          step="0.01"
                          className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="1"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                        <input
                          {...register(`items.${index}.unitPrice`)}
                          type="number"
                          step="0.01"
                          className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Total</label>
                        <div className="mt-1 px-3 py-2 bg-gray-50 border rounded-md text-sm font-medium">
                          ${calculateItemTotal(watchedItems[index] || {}).toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-12 md:col-span-1">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="mt-1 text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Subtotal:</span>
                      <span className="text-sm font-medium">${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Tax (8%):</span>
                      <span className="text-sm font-medium">${calculateTax().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Total:</span>
                      <span className="text-lg font-bold">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  placeholder="Additional notes or payment terms..."
                />
              </div>

              {/* Actions */}
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
                  {editing ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Invoice Preview</h2>
                <button 
                  onClick={() => setSelectedInvoice(null)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold">Invoice {selectedInvoice.invoiceNumber}</h3>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Issue Date:</p>
                    <p>{new Date(selectedInvoice.issueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="font-medium">Due Date:</p>
                    <p>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2">Bill To:</h4>
                <p>{customers.find(c => c.id === selectedInvoice.customerId)?.name}</p>
              </div>
              
              <div className="mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items?.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">{item.description}</td>
                        <td className="text-right py-2">{item.quantity}</td>
                        <td className="text-right py-2">${item.unitPrice?.toFixed(2)}</td>
                        <td className="text-right py-2">${item.total?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end mb-6">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${selectedInvoice.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${selectedInvoice.taxAmount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Total:</span>
                    <span>${selectedInvoice.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {selectedInvoice.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes:</h4>
                  <p className="text-sm text-gray-600">{selectedInvoice.notes}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button 
                  onClick={() => downloadPdf(selectedInvoice.id)} 
                  className="px-4 py-2 rounded-md border hover:bg-gray-50 flex items-center"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Download PDF
                </button>
                <button 
                  onClick={() => {
                    const customer = customers.find(c => c.id === selectedInvoice.customerId);
                    if (customer?.email) {
                      sendEmailMutation.mutate({ id: selectedInvoice.id, email: customer.email });
                    } else {
                      toast.error('Customer email not found');
                    }
                  }} 
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 flex items-center"
                >
                  <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;

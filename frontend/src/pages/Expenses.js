import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  ReceiptPercentIcon,
  PlusIcon,
  EyeIcon,
  PaperClipIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

const Expenses = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [filters, setFilters] = useState({ status: '', category: '', search: '', dateRange: '' });
  const [receiptFile, setReceiptFile] = useState(null);

  const { data: expensesData, isLoading } = useQuery(
    ['expenses', filters], 
    () => api.getExpenses(filters), 
    { keepPreviousData: true }
  );

  const { data: categoriesData } = useQuery('expense-categories', () => api.getExpenseCategories());

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const watchedCategory = watch('category');

  const createMutation = useMutation((payload) => api.createExpense(payload), {
    onSuccess: (response) => {
      toast.success('Expense created');
      queryClient.invalidateQueries('expenses');
      
      // Upload receipt if provided
      if (receiptFile && response.data?.id) {
        uploadReceiptMutation.mutate({ id: response.data.id, file: receiptFile });
      }
      
      setShowForm(false);
      reset();
      setReceiptFile(null);
    },
    onError: () => toast.error('Failed to create expense')
  });

  const updateMutation = useMutation(({ id, payload }) => api.updateExpense(id, payload), {
    onSuccess: () => {
      toast.success('Expense updated');
      queryClient.invalidateQueries('expenses');
      setShowForm(false);
      setEditing(null);
      reset();
      setReceiptFile(null);
    },
    onError: () => toast.error('Failed to update expense')
  });

  const deleteMutation = useMutation((id) => api.deleteExpense(id), {
    onSuccess: () => {
      toast.success('Expense deleted');
      queryClient.invalidateQueries('expenses');
    },
    onError: () => toast.error('Failed to delete expense')
  });

  const uploadReceiptMutation = useMutation(({ id, file }) => api.uploadExpenseReceipt(id, file), {
    onSuccess: () => {
      toast.success('Receipt uploaded');
      queryClient.invalidateQueries('expenses');
    },
    onError: () => toast.error('Failed to upload receipt')
  });

  const expenses = expensesData?.data?.expenses || expensesData?.data || [];
  const categories = categoriesData?.data?.categories || categoriesData?.data || [
    'Office Supplies', 'Travel', 'Meals & Entertainment', 'Marketing', 'Professional Services',
    'Software', 'Equipment', 'Utilities', 'Rent', 'Insurance', 'Other'
  ];

  const onSubmit = (form) => {
    const payload = {
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      vendor: form.vendor,
      expenseDate: form.expenseDate,
      status: form.status || 'pending',
      notes: form.notes,
      taxDeductible: form.taxDeductible || false
    };
    
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const onEdit = (expense) => {
    setEditing(expense);
    reset({
      description: expense.description || '',
      amount: expense.amount || 0,
      category: expense.category || '',
      vendor: expense.vendor || '',
      expenseDate: expense.expenseDate ? expense.expenseDate.split('T')[0] : '',
      status: expense.status || 'pending',
      notes: expense.notes || '',
      taxDeductible: expense.taxDeductible || false
    });
    setShowForm(true);
  };

  const onAdd = () => {
    setEditing(null);
    const today = new Date().toISOString().split('T')[0];
    reset({
      description: '',
      amount: 0,
      category: '',
      vendor: '',
      expenseDate: today,
      status: 'pending',
      notes: '',
      taxDeductible: false
    });
    setReceiptFile(null);
    setShowForm(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      case 'pending':
      default:
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getCategoryIcon = (category) => {
    // Simple category icon mapping
    const iconMap = {
      'Travel': '✈️',
      'Meals & Entertainment': '🍽️',
      'Office Supplies': '📝',
      'Marketing': '📊',
      'Software': '💻',
      'Equipment': '🔧',
      'Utilities': '⚡',
      'Rent': '🏢',
      'Insurance': '🛡️'
    };
    return iconMap[category] || '📁';
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const approvedCount = expenses.filter(e => e.status === 'approved').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Tracking</h1>
          <p className="text-gray-600">
            Manage business expenses • ${totalExpenses.toFixed(2)} total • {pendingCount} pending approval
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          New Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-semibold text-gray-900">${totalExpenses.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <ClockIcon className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-semibold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-semibold text-gray-900">{approvedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <input
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          placeholder="Search by description or vendor..."
          className="px-3 py-2 border rounded-md"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filters.dateRange}
          onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Dates</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
        </select>
      </div>

      {/* Expense List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expense</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr><td className="px-6 py-4" colSpan={6}>Loading...</td></tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td className="px-6 py-12 text-center text-gray-500" colSpan={6}>
                  <ReceiptPercentIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p>No expenses found</p>
                  <p className="text-sm">Create your first expense to get started</p>
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-3">{getCategoryIcon(expense.category)}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                        <div className="text-sm text-gray-500">{expense.vendor}</div>
                        {expense.receiptUrl && (
                          <div className="flex items-center mt-1">
                            <PaperClipIcon className="w-3 h-3 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500">Receipt attached</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <TagIcon className="w-3 h-3 mr-1" />
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${expense.amount?.toFixed(2)}
                    {expense.taxDeductible && (
                      <div className="text-xs text-green-600">Tax deductible</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                      {getStatusIcon(expense.status)}
                      <span className="ml-1 capitalize">{expense.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-2">
                    <button 
                      onClick={() => setSelectedExpense(expense)} 
                      className="text-gray-600 hover:text-gray-900"
                      title="View"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onEdit(expense)} 
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => deleteMutation.mutate(expense.id)} 
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Expense Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editing ? 'Edit Expense' : 'New Expense'}</h2>
                <button 
                  onClick={() => { setShowForm(false); setEditing(null); setReceiptFile(null); }} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description *</label>
                  <input
                    {...register('description', { required: 'Description is required' })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="Expense description"
                  />
                  {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount *</label>
                  <div className="mt-1 relative">
                    <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('amount', { required: 'Amount is required', min: 0 })}
                      type="number"
                      step="0.01"
                      className="w-full pl-10 pr-3 py-2 border rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select 
                    {...register('category', { required: 'Category is required' })} 
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vendor</label>
                  <input
                    {...register('vendor')}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="Vendor or merchant name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expense Date *</label>
                  <input
                    {...register('expenseDate', { required: 'Expense date is required' })}
                    type="date"
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                  {errors.expenseDate && <p className="text-sm text-red-600 mt-1">{errors.expenseDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select {...register('status')} className="mt-1 w-full px-3 py-2 border rounded-md">
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Receipt Upload</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files[0])}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Upload receipt image or PDF (optional)</p>
                {receiptFile && (
                  <p className="text-sm text-green-600 mt-1">✓ {receiptFile.name} selected</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  placeholder="Additional notes or details..."
                />
              </div>
              
              <div className="flex items-center">
                <input
                  {...register('taxDeductible')}
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                />
                <label className="ml-2 text-sm text-gray-700">This expense is tax deductible</label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => { setShowForm(false); setEditing(null); setReceiptFile(null); }} 
                  className="px-4 py-2 rounded-md border hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {editing ? 'Update Expense' : 'Create Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Expense Details</h2>
                <button 
                  onClick={() => setSelectedExpense(null)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{getCategoryIcon(selectedExpense.category)}</span>
                <div>
                  <h3 className="text-lg font-medium">{selectedExpense.description}</h3>
                  <p className="text-sm text-gray-600">{selectedExpense.vendor}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600">Amount:</p>
                  <p className="text-lg font-semibold">${selectedExpense.amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Category:</p>
                  <p>{selectedExpense.category}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Date:</p>
                  <p>{new Date(selectedExpense.expenseDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Status:</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedExpense.status)}`}>
                    {getStatusIcon(selectedExpense.status)}
                    <span className="ml-1 capitalize">{selectedExpense.status}</span>
                  </span>
                </div>
              </div>
              
              {selectedExpense.taxDeductible && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">✓ Tax deductible expense</p>
                </div>
              )}
              
              {selectedExpense.receiptUrl && (
                <div>
                  <p className="font-medium text-gray-600 mb-2">Receipt:</p>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center">
                      <PaperClipIcon className="w-5 h-5 text-gray-400 mr-2" />
                      <a 
                        href={selectedExpense.receiptUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View Receipt
                      </a>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedExpense.notes && (
                <div>
                  <p className="font-medium text-gray-600 mb-2">Notes:</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedExpense.notes}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  onClick={() => {
                    setSelectedExpense(null);
                    onEdit(selectedExpense);
                  }} 
                  className="px-4 py-2 rounded-md border hover:bg-gray-50"
                >
                  Edit Expense
                </button>
                <button 
                  onClick={() => setSelectedExpense(null)} 
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;

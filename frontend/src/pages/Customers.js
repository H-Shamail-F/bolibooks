import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const Customers = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery(['customers', search], () => api.getCustomers({ search }), {
    keepPreviousData: true,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const createMutation = useMutation((payload) => api.createCustomer(payload), {
    onSuccess: () => {
      toast.success('Customer created');
      queryClient.invalidateQueries('customers');
      setShowForm(false);
      reset();
    },
    onError: () => toast.error('Failed to create customer')
  });

  const updateMutation = useMutation(({ id, payload }) => api.updateCustomer(id, payload), {
    onSuccess: () => {
      toast.success('Customer updated');
      queryClient.invalidateQueries('customers');
      setShowForm(false);
      setEditing(null);
      reset();
    },
    onError: () => toast.error('Failed to update customer')
  });

  const deleteMutation = useMutation((id) => api.deleteCustomer(id), {
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries('customers');
    },
    onError: () => toast.error('Failed to delete customer')
  });

  const onSubmit = (form) => {
    const payload = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      taxId: form.taxId || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const onEdit = (customer) => {
    setEditing(customer);
    reset({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      taxId: customer.taxId || '',
    });
    setShowForm(true);
  };

  const onAdd = () => {
    setEditing(null);
    reset({ name: '', email: '', phone: '', address: '', taxId: '' });
    setShowForm(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer database</p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
        >
          New Customer
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full md:w-1/2 px-3 py-2 border rounded-md"
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr><td className="px-6 py-4" colSpan={5}>Loading...</td></tr>
            ) : (data?.data?.customers || data?.data || []).length === 0 ? (
              <tr><td className="px-6 py-4 text-gray-500" colSpan={5}>No customers found</td></tr>
            ) : (
              (data?.data?.customers || data?.data || []).map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{c.name}</div>
                    {c.taxId && <div className="text-xs text-gray-500">Tax ID: {c.taxId}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button onClick={() => onEdit(c)} className="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                    <button onClick={() => deleteMutation.mutate(c.id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Customer' : 'New Customer'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  placeholder="Customer name"
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    {...register('phone')}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="+1 555-0123"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  placeholder="Street, City, Zip"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                <input
                  {...register('taxId')}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., GST/VAT"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 rounded-md border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-indigo-600 text-white">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

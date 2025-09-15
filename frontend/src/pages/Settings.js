import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import {
  CogIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BellIcon,
  ShieldCheckIcon,
  PhotoIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

// Create axios instance for direct API calls
const apiInstance = {
  get: (url) => fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${url}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    }
  }).then(res => res.json()),
  put: (url, data) => fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${url}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  post: (url, data) => {
    const isFormData = data instanceof FormData;
    return fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      },
      body: isFormData ? data : JSON.stringify(data)
    }).then(res => res.json());
  },
  delete: (url) => fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${url}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    }
  }).then(res => res.json())
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [showUserForm, setShowUserForm] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tabs = [
    { id: 'company', name: 'Company Profile', icon: BuildingOfficeIcon },
    { id: 'users', name: 'User Management', icon: UsersIcon },
    { id: 'billing', name: 'Billing & Subscription', icon: CurrencyDollarIcon },
    { id: 'tax', name: 'Tax Settings', icon: DocumentTextIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'system', name: 'System Preferences', icon: CogIcon }
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
        
        <div className="bg-white rounded-lg shadow-lg">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'company' && <CompanySettings />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'billing' && <BillingSettings />}
            {activeTab === 'tax' && <TaxSettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'system' && <SystemPreferences />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Company Settings Component
const CompanySettings = () => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
  const [logoFile, setLogoFile] = useState(null);
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery('company-profile', 
    () => apiInstance.get('/api/companies/profile')
  );

  const updateCompanyMutation = useMutation(
    (data) => apiInstance.put('/api/companies/profile', data),
    {
      onSuccess: () => {
        toast.success('Company profile updated successfully');
        queryClient.invalidateQueries('company-profile');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update company profile');
      }
    }
  );

  const uploadLogoMutation = useMutation(
    (formData) => apiInstance.post('/api/companies/logo', formData),
    {
      onSuccess: () => {
        toast.success('Logo uploaded successfully');
        queryClient.invalidateQueries('company-profile');
        setLogoFile(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to upload logo');
      }
    }
  );

  useEffect(() => {
    if (company) {
      Object.keys(company).forEach(key => {
        setValue(key, company[key]);
      });
    }
  }, [company, setValue]);

  const onSubmit = (data) => {
    updateCompanyMutation.mutate(data);
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      const formData = new FormData();
      formData.append('logo', logoFile);
      uploadLogoMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse p-4">Loading company information...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
        
        {/* Logo Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Logo
          </label>
          <div className="flex items-center space-x-4">
            <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              {company?.logo ? (
                <img src={company.logo} alt="Logo" className="h-16 w-16 object-contain" />
              ) : (
                <PhotoIcon className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files[0])}
                className="mb-2"
              />
              {logoFile && (
                <button
                  type="button"
                  onClick={handleLogoUpload}
                  disabled={uploadLogoMutation.isLoading}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadLogoMutation.isLoading ? 'Uploading...' : 'Upload Logo'}
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Company name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                {...register('website')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              {...register('address')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax ID
              </label>
              <input
                type="text"
                {...register('taxId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                {...register('currency')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="MVR">MVR - Maldivian Rufiyaa</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="INR">INR - Indian Rupee</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fiscal Year Start (MM-DD)
            </label>
            <input
              type="text"
              placeholder="01-01"
              {...register('fiscalYearStart', {
                pattern: {
                  value: /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
                  message: 'Format should be MM-DD'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.fiscalYearStart && <p className="text-red-500 text-xs mt-1">{errors.fiscalYearStart.message}</p>}
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateCompanyMutation.isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {updateCompanyMutation.isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// User Management Component
const UserManagement = () => {
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery('company-users',
    () => apiInstance.get('/api/auth/users')
  );

  const { data: usageStats } = useQuery('usage-stats',
    () => apiInstance.get('/api/companies/usage-stats').then(data => data.data)
  );

  const createUserMutation = useMutation(
    (userData) => apiInstance.post('/api/auth/users', userData),
    {
      onSuccess: () => {
        toast.success('User created successfully');
        queryClient.invalidateQueries('company-users');
        queryClient.invalidateQueries('usage-stats');
        setShowUserForm(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create user');
      }
    }
  );

  const updateUserMutation = useMutation(
    ({ id, data }) => apiInstance.put(`/api/auth/users/${id}`, data),
    {
      onSuccess: () => {
        toast.success('User updated successfully');
        queryClient.invalidateQueries('company-users');
        setEditingUser(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update user');
      }
    }
  );

  const deleteUserMutation = useMutation(
    (userId) => apiInstance.delete(`/api/auth/users/${userId}`),
    {
      onSuccess: () => {
        toast.success('User deleted successfully');
        queryClient.invalidateQueries('company-users');
        queryClient.invalidateQueries('usage-stats');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete user');
      }
    }
  );

  if (isLoading) {
    return <div className="animate-pulse p-4">Loading users...</div>;
  }

  const canManageUsers = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">User Management</h3>
        {canManageUsers && (
          <button
            onClick={() => setShowUserForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* Usage Stats */}
      {usageStats && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">User Limit</h4>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span>{usageStats.users?.current || 0} of {usageStats.users?.limit || 0} users</span>
                <span>{Math.round(((usageStats.users?.current || 0) / (usageStats.users?.limit || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(((usageStats.users?.current || 0) / (usageStats.users?.limit || 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users?.map((user) => (
            <li key={user.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.id === currentUser?.id && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'admin' ? 'bg-green-100 text-green-800' :
                        user.role === 'cashier' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {canManageUsers && user.id !== currentUser?.id && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this user?')) {
                          deleteUserMutation.mutate(user.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* User Form Modal */}
      {(showUserForm || editingUser) && (
        <UserFormModal
          user={editingUser}
          onClose={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
          onSubmit={(data) => {
            if (editingUser) {
              updateUserMutation.mutate({ id: editingUser.id, data });
            } else {
              createUserMutation.mutate(data);
            }
          }}
          isLoading={createUserMutation.isLoading || updateUserMutation.isLoading}
        />
      )}
    </div>
  );
};

// User Form Modal Component
const UserFormModal = ({ user, onClose, onSubmit, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: user || {}
  });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {user ? 'Edit User' : 'Add New User'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                {...register('firstName', { required: 'First name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                {...register('lastName', { required: 'Last name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          
          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              {...register('role', { required: 'Role is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">User</option>
              <option value="cashier">Cashier</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
          </div>
          
          {user && (
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">Active User</span>
              </label>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{user ? 'Update' : 'Create'} User</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Billing Settings Component
const BillingSettings = () => {
  const { data: subscription, isLoading } = useQuery('subscription-info',
    () => apiInstance.get('/api/companies/subscription')
  );

  const { data: usageStats } = useQuery('usage-stats',
    () => apiInstance.get('/api/companies/usage-stats').then(data => data.data)
  );

  if (isLoading) {
    return <div className="animate-pulse p-4">Loading billing information...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Billing & Subscription</h3>
      
      {/* Current Plan */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900">Current Plan</h4>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            subscription?.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' :
            subscription?.subscriptionStatus === 'trial' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {subscription?.subscriptionStatus || 'Unknown'}
          </span>
        </div>
        
        {subscription?.SubscriptionPlan && (
          <div className="space-y-2">
            <p className="text-lg font-semibold">{subscription.SubscriptionPlan.name}</p>
            <p className="text-gray-600">{subscription.SubscriptionPlan.description}</p>
            <p className="text-2xl font-bold text-blue-600">
              ${subscription.SubscriptionPlan.monthlyPrice}/month
            </p>
            {subscription.subscriptionEndDate && (
              <p className="text-sm text-gray-500">
                {subscription.subscriptionStatus === 'trial' ? 'Trial ends' : 'Next billing date'}: {' '}
                {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      {usageStats && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h4>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Users</span>
                <span>{usageStats.users?.current || 0} / {usageStats.users?.limit || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(((usageStats.users?.current || 0) / (usageStats.users?.limit || 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Products</span>
                <span>{usageStats.products?.current || 0} / {usageStats.products?.limit || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${Math.min(((usageStats.products?.current || 0) / (usageStats.products?.limit || 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Upgrade/Manage Subscription */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-blue-900 mb-2">Need more features?</h4>
        <p className="text-blue-700 mb-4">Upgrade your plan to unlock additional users, products, and premium features.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          View Plans & Pricing
        </button>
      </div>
    </div>
  );
};

// Tax Settings Component
const TaxSettings = () => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery('company-profile',
    () => apiInstance.get('/api/companies/profile')
  );

  const updateTaxMutation = useMutation(
    (data) => apiInstance.put('/api/companies/profile', data),
    {
      onSuccess: () => {
        toast.success('Tax settings updated successfully');
        queryClient.invalidateQueries('company-profile');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update tax settings');
      }
    }
  );

  useEffect(() => {
    if (company) {
      setValue('gstEnabled', company.gstEnabled);
      setValue('gstRate', company.gstRate);
    }
  }, [company, setValue]);

  const onSubmit = (data) => {
    updateTaxMutation.mutate({
      gstEnabled: data.gstEnabled,
      gstRate: parseFloat(data.gstRate) || 0
    });
  };

  if (isLoading) {
    return <div className="animate-pulse p-4">Loading tax settings...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Tax Settings</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">GST/VAT Configuration</h4>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  {...register('gstEnabled')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">Enable GST/VAT</span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-6">
                Enable this to automatically calculate and include GST/VAT in invoices and sales
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST/VAT Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('gstRate', {
                  min: { value: 0, message: 'Rate cannot be negative' },
                  max: { value: 100, message: 'Rate cannot exceed 100%' }
                })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.gstRate && <p className="text-red-500 text-xs mt-1">{errors.gstRate.message}</p>}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateTaxMutation.isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {updateTaxMutation.isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>Save Tax Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// Notification Settings Component
const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    lowStockAlerts: true,
    paymentReminders: true,
    invoiceUpdates: true,
    systemUpdates: false,
    marketingEmails: false
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = () => {
    // TODO: Implement API call to save notification settings
    toast.success('Notification settings saved');
  };

  const notificationOptions = [
    {
      key: 'emailNotifications',
      label: 'Email Notifications',
      description: 'Receive important updates via email'
    },
    {
      key: 'lowStockAlerts',
      label: 'Low Stock Alerts',
      description: 'Get notified when products are running low'
    },
    {
      key: 'paymentReminders',
      label: 'Payment Reminders',
      description: 'Reminders for overdue invoices and payments'
    },
    {
      key: 'invoiceUpdates',
      label: 'Invoice Updates',
      description: 'Notifications when invoices are paid or updated'
    },
    {
      key: 'systemUpdates',
      label: 'System Updates',
      description: 'Information about new features and system maintenance'
    },
    {
      key: 'marketingEmails',
      label: 'Marketing Emails',
      description: 'Tips, best practices, and promotional content'
    }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Email Preferences</h4>
        
        <div className="space-y-4">
          {notificationOptions.map((option) => (
            <div key={option.key} className="flex items-start space-x-3">
              <input
                type="checkbox"
                id={option.key}
                checked={settings[option.key]}
                onChange={(e) => handleSettingChange(option.key, e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <div className="flex-1">
                <label htmlFor={option.key} className="text-sm font-medium text-gray-700 cursor-pointer">
                  {option.label}
                </label>
                <p className="text-sm text-gray-500 mt-1">{option.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveSettings}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

// System Preferences Component
const SystemPreferences = () => {
  const [preferences, setPreferences] = useState({
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12',
    numberFormat: 'en-US',
    theme: 'light',
    autoBackup: true,
    dataRetention: '12'
  });

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const savePreferences = () => {
    // TODO: Implement API call to save system preferences
    toast.success('System preferences saved');
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">System Preferences</h3>
      
      <div className="space-y-6">
        {/* Display Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Display Settings</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Format
              </label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Format
              </label>
              <select
                value={preferences.timeFormat}
                onChange={(e) => handlePreferenceChange('timeFormat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="12">12-hour (AM/PM)</option>
                <option value="24">24-hour</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Data Management */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Data Management</h4>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.autoBackup}
                  onChange={(e) => handlePreferenceChange('autoBackup', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">Enable Automatic Backups</span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-6">
                Automatically backup your data daily for security
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Retention Period (months)
              </label>
              <select
                value={preferences.dataRetention}
                onChange={(e) => handlePreferenceChange('dataRetention', e.target.value)}
                className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
                <option value="60">5 years</option>
                <option value="-1">Forever</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                How long to keep deleted records in the system
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={savePreferences}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

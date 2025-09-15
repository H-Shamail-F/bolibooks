import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import {
  ChartBarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const SuperAdmin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    page: 1
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'companies') {
      fetchCompanies();
    }
  }, [activeTab, filters]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/super-admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        status: filters.status,
        search: filters.search,
        page: filters.page,
        limit: 20
      });

      const response = await fetch(`/api/super-admin/companies?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies);
      } else {
        throw new Error('Failed to fetch companies');
      }
    } catch (error) {
      toast.error('Failed to load companies');
      console.error('Companies fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const grantTrial = async (companyId, data) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/companies/${companyId}/grant-trial`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast.success('Trial period granted successfully');
        fetchCompanies();
        setSelectedCompany(null);
        reset();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant trial');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updateCompanyStatus = async (companyId, status, notes = '') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/companies/${companyId}/subscription`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      });

      if (response.ok) {
        toast.success('Company status updated successfully');
        fetchCompanies();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'trial':
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'suspended':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Panel</h1>
        <p className="text-gray-600">System management and company oversight</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 inline-block mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'companies'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BuildingOfficeIcon className="w-5 h-5 inline-block mr-2" />
            Companies
          </button>
        </nav>
      </div>

      {activeTab === 'dashboard' && dashboardData && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <BuildingOfficeIcon className="w-8 h-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Companies</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.statistics.totalCompanies}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.statistics.pendingCompanies}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <ClockIcon className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Trial Companies</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.statistics.trialCompanies}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Active Companies</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.statistics.activeCompanies}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Companies */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Recent Registrations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.recentCompanies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {company.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company.Users[0]?.firstName} {company.Users[0]?.lastName}
                        <br />
                        <span className="text-xs text-gray-400">{company.Users[0]?.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(company.subscriptionStatus)}`}>
                          {company.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(company.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>

          {/* Companies Table */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                          <div className="text-xs text-gray-500">ID: {company.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {company.Users[0]?.firstName} {company.Users[0]?.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{company.Users[0]?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(company.subscriptionStatus)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(company.subscriptionStatus)}`}>
                            {company.subscriptionStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company.Users[0]?.lastLoginAt 
                          ? new Date(company.Users[0].lastLoginAt).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {company.subscriptionStatus === 'pending' && (
                          <button
                            onClick={() => setSelectedCompany(company)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                          >
                            Grant Trial
                          </button>
                        )}
                        <select
                          onChange={(e) => {
                            if (e.target.value && e.target.value !== company.subscriptionStatus) {
                              updateCompanyStatus(company.id, e.target.value);
                            }
                          }}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                          defaultValue=""
                        >
                          <option value="">Change Status</option>
                          <option value="trial">Set to Trial</option>
                          <option value="active">Set to Active</option>
                          <option value="suspended">Suspend</option>
                          <option value="pending">Set to Pending</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Grant Trial Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Grant Trial Period
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Company: <strong>{selectedCompany.name}</strong>
            </p>
            
            <form onSubmit={handleSubmit((data) => grantTrial(selectedCompany.id, data))}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trial Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    defaultValue="30"
                    {...register('trialDays', { 
                      required: 'Trial days is required',
                      min: { value: 1, message: 'Minimum 1 day' },
                      max: { value: 365, message: 'Maximum 365 days' }
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  {errors.trialDays && (
                    <p className="text-red-600 text-sm mt-1">{errors.trialDays.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Reason for granting trial..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setSelectedCompany(null)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Grant Trial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;

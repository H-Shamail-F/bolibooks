import React from 'react';
import { useQuery } from 'react-query';
import { 
  CurrencyDollarIcon, 
  DocumentTextIcon, 
  UsersIcon, 
  CubeIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../services/api';

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery('dashboard-stats', api.getDashboardStats);
  const { data: recentInvoices } = useQuery('recent-invoices', () => api.getInvoices({ limit: 5 }));
  const { data: lowStockProducts } = useQuery('low-stock', api.getLowStockProducts);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-300 rounded-lg h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats?.totalRevenue?.toLocaleString() || 0}`,
      icon: CurrencyDollarIcon,
      change: stats?.revenueChange || 0,
      changeType: stats?.revenueChange >= 0 ? 'increase' : 'decrease'
    },
    {
      title: 'Outstanding Invoices',
      value: stats?.outstandingInvoices || 0,
      icon: DocumentTextIcon,
      change: stats?.invoiceChange || 0,
      changeType: stats?.invoiceChange >= 0 ? 'increase' : 'decrease'
    },
    {
      title: 'Total Customers',
      value: stats?.totalCustomers || 0,
      icon: UsersIcon,
      change: stats?.customerChange || 0,
      changeType: stats?.customerChange >= 0 ? 'increase' : 'decrease'
    },
    {
      title: 'Products',
      value: stats?.totalProducts || 0,
      icon: CubeIcon,
      change: stats?.productChange || 0,
      changeType: stats?.productChange >= 0 ? 'increase' : 'decrease'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to BoliBooks - Your business overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <stat.icon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {stat.changeType === 'increase' ? (
                <TrendingUpIcon className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDownIcon className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm ml-1 ${
                stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(stat.change)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">from last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.monthlyRevenue || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* P&L Overview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit & Loss Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Revenue</span>
              <span className="text-lg font-semibold text-green-600">
                ${stats?.currentMonthRevenue?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Expenses</span>
              <span className="text-lg font-semibold text-red-600">
                ${stats?.currentMonthExpenses?.toLocaleString() || 0}
              </span>
            </div>
            <hr />
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-gray-900">Net Profit</span>
              <span className={`text-xl font-bold ${
                (stats?.currentMonthRevenue || 0) - (stats?.currentMonthExpenses || 0) >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                ${((stats?.currentMonthRevenue || 0) - (stats?.currentMonthExpenses || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoices</h3>
          <div className="space-y-3">
            {recentInvoices?.invoices?.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-600">{invoice.Customer?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${invoice.total}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Alerts</h3>
          {lowStockProducts?.length > 0 ? (
            <div className="space-y-3">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600 font-medium">{product.stockQuantity} left</p>
                    <p className="text-xs text-gray-500">Min: {product.lowStockThreshold}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No low stock alerts</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

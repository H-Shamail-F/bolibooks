import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  CubeIcon,
  UsersIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Reports = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon },
    { id: 'sales', name: 'Sales Reports', icon: DocumentChartBarIcon },
    { id: 'inventory', name: 'Inventory Reports', icon: CubeIcon },
    { id: 'customers', name: 'Customer Reports', icon: UsersIcon },
    { id: 'financial', name: 'Financial Reports', icon: CurrencyDollarIcon }
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          
          {/* Date Range Selector */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>
        
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
            {activeTab === 'dashboard' && <DashboardReport dateRange={dateRange} />}
            {activeTab === 'sales' && <SalesReports dateRange={dateRange} />}
            {activeTab === 'inventory' && <InventoryReports dateRange={dateRange} />}
            {activeTab === 'customers' && <CustomerReports dateRange={dateRange} />}
            {activeTab === 'financial' && <FinancialReports dateRange={dateRange} />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Report Component
const DashboardReport = ({ dateRange }) => {
  const { data: dashboardStats, isLoading } = useQuery(
    ['dashboard-stats', dateRange],
    () => apiInstance.get('/api/reports/dashboard-stats')
  );

  if (isLoading) {
    return <div className="animate-pulse p-4">Loading dashboard...</div>;
  }

  // Ensure we have safe data structure
  const stats = dashboardStats && typeof dashboardStats === 'object' ? dashboardStats : {};
  
  // Ensure arrays are actually arrays
  const safeMonthlyRevenue = Array.isArray(stats.monthlyRevenue) ? stats.monthlyRevenue : [];

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: `$${(stats.totalRevenue || 0).toLocaleString()}`,
      change: stats.revenueChange || 0,
      icon: CurrencyDollarIcon,
      color: 'text-green-600 bg-green-100'
    },
    {
      title: 'This Month Revenue',
      value: `$${(stats.currentMonthRevenue || 0).toLocaleString()}`,
      change: stats.revenueChange || 0,
      icon: ChartBarIcon,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      title: 'Outstanding Invoices',
      value: stats.outstandingInvoices || 0,
      icon: DocumentChartBarIcon,
      color: 'text-orange-600 bg-orange-100'
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers || 0,
      icon: UsersIcon,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts || 0,
      icon: CubeIcon,
      color: 'text-indigo-600 bg-indigo-100'
    },
    {
      title: 'Monthly Expenses',
      value: `$${(stats.currentMonthExpenses || 0).toLocaleString()}`,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600 bg-red-100'
    }
  ];

  // Revenue Chart Data
  const revenueChartData = {
    labels: safeMonthlyRevenue.map(item => item && item.month ? item.month : ''),
    datasets: [
      {
        label: 'Monthly Revenue',
        data: safeMonthlyRevenue.map(item => item && item.revenue ? parseFloat(item.revenue) : 0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Revenue Trend (Last 6 Months)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${card.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="text-sm font-medium text-gray-500">
                    {card.title}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {card.value}
                  </div>
                  {card.change !== undefined && (
                    <div className={`flex items-center text-sm ${
                      card.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {card.change >= 0 ? (
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      )}
                      {Math.abs(card.change).toFixed(1)}% from last month
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <Line data={revenueChartData} options={chartOptions} />
      </div>
    </div>
  );
};

// Sales Reports Component
const SalesReports = ({ dateRange }) => {
  const { data: salesData, isLoading } = useQuery(
    ['sales-report', dateRange],
    () => apiInstance.get(`/api/reports/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
  );

  const downloadReport = useMutation(
    (format) => {
      const url = `/api/reports/sales/export?format=${format}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      window.open(url, '_blank');
    },
    {
      onSuccess: () => {
        toast.success('Report download started');
      },
      onError: () => {
        toast.error('Failed to download report');
      }
    }
  );

  if (isLoading) {
    return <div className="animate-pulse p-4">Loading sales reports...</div>;
  }

  // Ensure we have safe array data
  const salesByPeriod = Array.isArray(salesData?.salesByPeriod) ? salesData.salesByPeriod : [];
  const salesByCustomer = Array.isArray(salesData?.salesByCustomer) ? salesData.salesByCustomer : [];
  const productSales = Array.isArray(salesData?.productSales) ? salesData.productSales : [];

  // Sales by Period Chart
  const periodChartData = {
    labels: salesByPeriod.map(item => new Date(item.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
    datasets: [
      {
        label: 'Total Sales',
        data: salesByPeriod.map(item => parseFloat(item.totalAmount) || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
      {
        label: 'Paid Amount',
        data: salesByPeriod.map(item => parseFloat(item.paidAmount) || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex justify-end space-x-2">
        <button
          onClick={() => downloadReport.mutate('pdf')}
          disabled={downloadReport.isLoading}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          <span>Export PDF</span>
        </button>
        <button
          onClick={() => downloadReport.mutate('excel')}
          disabled={downloadReport.isLoading}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Sales by Period Chart */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Sales by Period</h3>
        <Bar data={periodChartData} options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '$' + value.toLocaleString();
                }
              }
            }
          }
        }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Customers</h3>
          <div className="space-y-3">
          {salesByCustomer.slice(0, 10).map((customer, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{customer['Customer.name'] || customer.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{customer.invoiceCount || customer.count || 0} invoices</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ${parseFloat(customer.totalAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${parseFloat(customer.paidAmount || 0).toLocaleString()} paid
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products</h3>
          <div className="space-y-3">
            {productSales.slice(0, 10).map((product, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{product['Product.name'] || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">SKU: {product['Product.sku'] || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ${parseFloat(product.totalAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {parseFloat(product.totalQuantity || 0)} units
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Inventory Reports Component
const InventoryReports = ({ dateRange }) => {
  const { data: inventoryData, isLoading } = useQuery(
    ['inventory-report', dateRange],
    () => apiInstance.get(`/api/reports/inventory?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
  );

  if (isLoading) {
    return <div className="animate-pulse p-4">Loading inventory reports...</div>;
  }

  // Ensure we have safe array data
  const lowStockProducts = Array.isArray(inventoryData?.lowStock) ? inventoryData.lowStock : [];
  const topMovingProducts = Array.isArray(inventoryData?.topMoving) ? inventoryData.topMoving : [];
  const categoryBreakdown = Array.isArray(inventoryData?.byCategory) ? inventoryData.byCategory : [];

  // Category Pie Chart - with safety checks
  const safeCategories = Array.isArray(categoryBreakdown) ? categoryBreakdown : [];
  const categoryChartData = {
    labels: safeCategories.map(cat => (typeof cat === 'object' && cat.category) ? cat.category : 'Uncategorized'),
    datasets: [
      {
        data: safeCategories.map(cat => (typeof cat === 'object' && cat.totalValue) ? parseFloat(cat.totalValue) : 0),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(248, 113, 113, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory by Category */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Value by Category</h3>
          <Pie data={categoryChartData} options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom',
              },
            },
          }} />
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mr-2" />
            Low Stock Items
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {(lowStockProducts || []).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No low stock items</p>
            ) : (
              (lowStockProducts || []).map((product, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">{product.name || 'Unknown Product'}</p>
                    <p className="text-sm text-gray-500">SKU: {product.sku || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-600">
                      {product.stockQuantity || 0} left
                    </p>
                    <p className="text-sm text-gray-500">
                      Min: {product.lowStockThreshold || 0}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Moving Products */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Moving Products</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(topMovingProducts || []).map((product, index) => {
                const stockQty = product.stockQuantity || 0;
                const lowThreshold = product.lowStockThreshold || 0;
                const price = product.price || product.unitPrice || 0;
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.name || 'Unknown Product'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.sku || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stockQty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${(price * stockQty).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        stockQty <= lowThreshold
                          ? 'bg-red-100 text-red-800'
                          : stockQty <= lowThreshold * 2
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {stockQty <= lowThreshold
                          ? 'Low Stock'
                          : stockQty <= lowThreshold * 2
                          ? 'Medium Stock'
                          : 'Good Stock'
                        }
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Customer Reports Component
const CustomerReports = ({ dateRange }) => {
  const { data: customerData, isLoading } = useQuery(
    ['customer-report', dateRange],
    () => apiInstance.get(`/api/reports/customers?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
  );

  if (isLoading) {
    return <div className="animate-pulse p-4">Loading customer reports...</div>;
  }

  // Ensure we have safe array data
  const topCustomers = Array.isArray(customerData?.topCustomers) ? customerData.topCustomers : [];
  const customerGrowth = Array.isArray(customerData?.growth) ? customerData.growth : [];

  return (
    <div className="space-y-6">
      {/* Customer Growth Chart */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Growth</h3>
        <Line data={{
          labels: customerGrowth.map(item => new Date(item.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
          datasets: [
            {
              label: 'New Customers',
              data: customerGrowth.map(item => item.newCustomers || 0),
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              tension: 0.4,
            },
            {
              label: 'Total Customers',
              data: customerGrowth.map(item => item.totalCustomers || 0),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
            },
          ],
        }} options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            }
          }
        }} />
      </div>

      {/* Top Customers Table */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Customers by Revenue</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Order Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Order
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(topCustomers || []).map((customer, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{customer.email || 'No email'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${parseFloat(customer.totalRevenue || customer.totalAmount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.orderCount || customer.count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(parseFloat(customer.totalRevenue || customer.totalAmount || 0) / (customer.orderCount || customer.count || 1)).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Financial Reports Component
const FinancialReports = ({ dateRange }) => {
  const { data: profitLossData, isLoading } = useQuery(
    ['profit-loss-report', dateRange],
    () => apiInstance.get(`/api/reports/profit-loss?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
  );

  if (isLoading) {
    return <div className="animate-pulse p-4">Loading financial reports...</div>;
  }

  const summary = profitLossData?.summary || {};
  const expenses = profitLossData?.expenses || {};

  return (
    <div className="space-y-6">
      {/* Profit & Loss Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-center">
            <p className="text-lg font-semibold text-green-600">
              ${(summary.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Total Revenue</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-center">
            <p className="text-lg font-semibold text-red-600">
              ${(summary.totalExpenses || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Total Expenses</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-center">
            <p className={`text-lg font-semibold ${
              summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${(summary.netProfit || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Net Profit</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-center">
            <p className={`text-lg font-semibold ${
              summary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(summary.profitMargin || 0).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">Profit Margin</p>
          </div>
        </div>
      </div>

      {/* Expenses by Category */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses by Category</h3>
        <div className="space-y-3">
          {(expenses.byCategory || []).map((expense, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="font-medium text-gray-900 capitalize">
                {expense.category || 'Uncategorized'}
              </span>
              <span className="font-semibold text-red-600">
                ${parseFloat(expense.amount || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// API Instance (reuse from Settings)
const apiInstance = {
  get: (url) => fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${url}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    }
  }).then(res => res.json()),
};

export default Reports;

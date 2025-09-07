import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Company APIs
export const companyAPI = {
  get: () => api.get('/companies/profile'),
  update: (data) => api.put('/companies/profile', data),
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/companies/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Customer APIs
export const customerAPI = {
  getAll: (params = {}) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Product APIs
export const productAPI = {
  getAll: (params = {}) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getLowStock: () => api.get('/products/low-stock'),
};

// Invoice APIs
export const invoiceAPI = {
  getAll: (params = {}) => api.get('/invoices', { params }),
  get: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  convertToInvoice: (id) => api.post(`/invoices/${id}/convert-to-invoice`),
  sendEmail: (id, email) => api.post(`/invoices/${id}/send`, { email }),
  downloadPdf: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

// Payment APIs
export const paymentAPI = {
  getAll: (params = {}) => api.get('/payments', { params }),
  get: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
};

// Expense APIs
export const expenseAPI = {
  getAll: (params = {}) => api.get('/expenses', { params }),
  get: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  uploadReceipt: (id, file) => {
    const formData = new FormData();
    formData.append('receipt', file);
    return api.post(`/expenses/${id}/receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getCategories: () => api.get('/expenses/categories'),
};

// Report APIs
export const reportAPI = {
  getProfitLoss: (params = {}) => api.get('/reports/profit-loss', { params }),
  getSalesReport: (params = {}) => api.get('/reports/sales', { params }),
  getInventoryReport: (params = {}) => api.get('/reports/inventory', { params }),
  getReceivablesReport: (params = {}) => api.get('/reports/receivables', { params }),
  getDashboardStats: () => api.get('/reports/dashboard-stats'),
  exportToPdf: (reportType, params = {}) => 
    api.get(`/reports/${reportType}/pdf`, { 
      params, 
      responseType: 'blob' 
    }),
};

// Unified API object
const apiService = {
  // Auth
  login: authAPI.login,
  register: authAPI.register,
  logout: authAPI.logout,
  getMe: authAPI.me,

  // Company
  getCompany: companyAPI.get,
  updateCompany: companyAPI.update,
  uploadCompanyLogo: companyAPI.uploadLogo,

  // Customers
  getCustomers: customerAPI.getAll,
  getCustomer: customerAPI.get,
  createCustomer: customerAPI.create,
  updateCustomer: customerAPI.update,
  deleteCustomer: customerAPI.delete,

  // Products
  getProducts: productAPI.getAll,
  getProduct: productAPI.get,
  createProduct: productAPI.create,
  updateProduct: productAPI.update,
  deleteProduct: productAPI.delete,
  getLowStockProducts: productAPI.getLowStock,

  // Invoices
  getInvoices: invoiceAPI.getAll,
  getInvoice: invoiceAPI.get,
  createInvoice: invoiceAPI.create,
  updateInvoice: invoiceAPI.update,
  deleteInvoice: invoiceAPI.delete,
  convertQuoteToInvoice: invoiceAPI.convertToInvoice,
  sendInvoiceEmail: invoiceAPI.sendEmail,
  downloadInvoicePdf: invoiceAPI.downloadPdf,

  // Payments
  getPayments: paymentAPI.getAll,
  getPayment: paymentAPI.get,
  createPayment: paymentAPI.create,
  updatePayment: paymentAPI.update,
  deletePayment: paymentAPI.delete,

  // Expenses
  getExpenses: expenseAPI.getAll,
  getExpense: expenseAPI.get,
  createExpense: expenseAPI.create,
  updateExpense: expenseAPI.update,
  deleteExpense: expenseAPI.delete,
  uploadExpenseReceipt: expenseAPI.uploadReceipt,
  getExpenseCategories: expenseAPI.getCategories,

  // Reports
  getProfitLossReport: reportAPI.getProfitLoss,
  getSalesReport: reportAPI.getSalesReport,
  getInventoryReport: reportAPI.getInventoryReport,
  getReceivablesReport: reportAPI.getReceivablesReport,
  getDashboardStats: reportAPI.getDashboardStats,
  exportReportToPdf: reportAPI.exportToPdf,
};

export default apiService;

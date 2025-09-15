import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  ShoppingCartIcon, 
  CreditCardIcon, 
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  PrinterIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

const POS = () => {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerId, setCustomerId] = useState('');
  const [currentSale, setCurrentSale] = useState(null);

  const { data: productsData, isLoading: loadingProducts } = useQuery(
    ['products', { search: searchTerm, category: selectedCategory }],
    () => api.getProducts({ search: searchTerm, category: selectedCategory }),
    { keepPreviousData: true }
  );

  const { data: customersData } = useQuery('customers', () => api.getCustomers());

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const completeSaleMutation = useMutation(
    (saleData) => {
      // This would normally call a POS-specific API endpoint
      // For now, we'll use the general API structure
      return api.post('/pos/sales', saleData);
    },
    {
      onSuccess: (response) => {
        toast.success('Sale completed successfully!');
        setCurrentSale(response.data);
        setCart([]);
        setCustomerId('');
        setShowCheckout(false);
        queryClient.invalidateQueries(['pos-sales']);
      },
      onError: () => {
        toast.error('Failed to complete sale');
      }
    }
  );

  const products = productsData?.data?.products || productsData?.data || [];
  const customers = customersData?.data?.customers || customersData?.data || [];
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1, unitPrice: product.unitPrice }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
    toast.success('Item removed from cart');
  };

  const clearCart = () => {
    setCart([]);
    toast.success('Cart cleared');
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const completeSale = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const saleData = {
      customerId: customerId || null,
      items: cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.quantity
      })),
      subtotal: calculateSubtotal(),
      taxAmount: calculateTax(),
      total: calculateTotal(),
      paymentMethod,
      status: 'completed'
    };

    completeSaleMutation.mutate(saleData);
  };

  const printReceipt = () => {
    if (!currentSale) return;
    
    // Create a simple receipt format
    const receiptContent = `
      BoliBooks POS Receipt\n
      Sale ID: ${currentSale.id}\n
      Date: ${new Date().toLocaleString()}\n\n
      Items:\n
      ${cart.map(item => `${item.name} x${item.quantity} - $${(item.unitPrice * item.quantity).toFixed(2)}`).join('\n')}
      \n\n
      Subtotal: $${calculateSubtotal().toFixed(2)}\n
      Tax: $${calculateTax().toFixed(2)}\n
      Total: $${calculateTotal().toFixed(2)}\n
      Payment: ${paymentMethod.toUpperCase()}\n\n
      Thank you for your business!
    `;
    
    // Simple print using window.print with formatted content
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Receipt</title></head>
        <body style="font-family: monospace; white-space: pre-line;">
          ${receiptContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-100 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-indigo-800">
                  Cart: {cart.length} items | ${calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Products Panel */}
        <div className="flex-1 p-6">
          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {loadingProducts ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
                  <div className="bg-gray-200 h-24 rounded mb-3" />
                  <div className="bg-gray-200 h-4 rounded mb-2" />
                  <div className="bg-gray-200 h-4 rounded w-2/3" />
                </div>
              ))
            ) : products.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No products found</p>
              </div>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow border"
                >
                  <h3 className="font-medium text-sm text-gray-900 mb-1 truncate">{product.name}</h3>
                  <p className="text-lg font-bold text-indigo-600">${product.unitPrice?.toFixed(2)}</p>
                  {product.trackInventory && (
                    <p className="text-xs text-gray-500">{product.stockQuantity} in stock</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-96 bg-white border-l shadow-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Cart</h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 space-y-4 mb-6">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>Cart is empty</p>
                  <p className="text-sm">Add products to start a sale</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.name}</h4>
                      <p className="text-sm text-gray-600">${item.unitPrice?.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="p-1 rounded hover:bg-gray-200"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="p-1 rounded hover:bg-gray-200"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 rounded hover:bg-red-100 text-red-600 ml-2"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Total */}
            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (8%):</span>
                  <span>${calculateTax().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Checkout Section */}
            {cart.length > 0 && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer (Optional)</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="digital">Digital Wallet</option>
                  </select>
                </div>
                
                <button
                  onClick={completeSale}
                  disabled={completeSaleMutation.isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <CheckIcon className="h-5 w-5" />
                  <span>{completeSaleMutation.isLoading ? 'Processing...' : 'Complete Sale'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sale Success Modal */}
      {currentSale && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="text-center">
              <CheckIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sale Completed!</h2>
              <p className="text-gray-600 mb-4">Transaction processed successfully</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-2xl font-bold text-indigo-600">${calculateTotal().toFixed(2)}</div>
                <div className="text-sm text-gray-600">Payment Method: {paymentMethod.toUpperCase()}</div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={printReceipt}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg flex items-center justify-center space-x-2"
                >
                  <PrinterIcon className="h-4 w-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setCurrentSale(null)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg"
                >
                  New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;

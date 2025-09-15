import React, { useState, useEffect } from 'react';
import { 
  CreditCardIcon, 
  BanknotesIcon,
  BuildingLibraryIcon 
} from '@heroicons/react/24/outline';
import StripePaymentForm from './StripePaymentForm';
import PayPalPaymentForm from './PayPalPaymentForm';
import paymentService from '../../services/paymentService';

const PaymentComponent = ({ 
  amount, 
  currency = 'USD', 
  description, 
  onSuccess, 
  onError, 
  onCancel,
  allowedMethods = ['stripe', 'paypal', 'cash', 'card', 'bank_transfer']
}) => {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [availableMethods, setAvailableMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cashReceived, setCashReceived] = useState('');

  useEffect(() => {
    const fetchAvailablePaymentMethods = async () => {
      try {
        const methods = await paymentService.getAvailablePaymentMethods();
        
        // Filter by allowed methods
        const filtered = [];
        
        if (allowedMethods.includes('stripe') && methods.stripe) {
          filtered.push('stripe');
        }
        if (allowedMethods.includes('paypal') && methods.paypal) {
          filtered.push('paypal');
        }
        if (allowedMethods.includes('cash')) {
          filtered.push('cash');
        }
        if (allowedMethods.includes('card')) {
          filtered.push('card');
        }
        if (allowedMethods.includes('bank_transfer')) {
          filtered.push('bank_transfer');
        }
        
        setAvailableMethods(filtered);
        
        // Set default payment method
        if (filtered.length > 0) {
          setPaymentMethod(filtered.includes('stripe') ? 'stripe' : filtered[0]);
        }
      } catch (error) {
        console.error('Failed to fetch payment methods:', error);
        // Fallback to basic methods
        const fallback = allowedMethods.filter(method => ['cash', 'card', 'bank_transfer'].includes(method));
        setAvailableMethods(fallback);
        setPaymentMethod(fallback[0] || 'cash');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailablePaymentMethods();
  }, [allowedMethods]);

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'stripe':
        return <CreditCardIcon className="h-6 w-6" />;
      case 'paypal':
        return <div className="h-6 w-6 flex items-center justify-center text-blue-600 font-bold">P</div>;
      case 'cash':
        return <BanknotesIcon className="h-6 w-6" />;
      case 'card':
        return <CreditCardIcon className="h-6 w-6" />;
      case 'bank_transfer':
        return <BuildingLibraryIcon className="h-6 w-6" />;
      default:
        return <CreditCardIcon className="h-6 w-6" />;
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'stripe':
        return 'Credit/Debit Card (Stripe)';
      case 'paypal':
        return 'PayPal';
      case 'cash':
        return 'Cash';
      case 'card':
        return 'Credit/Debit Card';
      case 'bank_transfer':
        return 'Bank Transfer';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  const handleCashPayment = () => {
    const received = parseFloat(cashReceived);
    const total = parseFloat(amount);
    
    if (received < total) {
      onError?.('Cash received is less than the total amount');
      return;
    }

    const change = received - total;
    
    onSuccess?.({
      paymentMethod: 'cash',
      amount: total,
      currency: currency,
      cashReceived: received,
      change: change,
      status: 'completed'
    });
  };

  const handleCardPayment = () => {
    // For card payments without Stripe, we'll just mark as completed
    // In a real implementation, you'd integrate with a different payment processor
    onSuccess?.({
      paymentMethod: 'card',
      amount: parseFloat(amount),
      currency: currency,
      status: 'completed'
    });
  };

  const handleBankTransferPayment = () => {
    // For bank transfer, we'll mark as pending and provide transfer details
    onSuccess?.({
      paymentMethod: 'bank_transfer',
      amount: parseFloat(amount),
      currency: currency,
      status: 'pending',
      message: 'Bank transfer details will be provided'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading payment methods...</span>
      </div>
    );
  }

  if (availableMethods.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="text-gray-500 mb-2">No payment methods available</div>
          <p className="text-sm text-gray-400">
            Please contact support to enable payment processing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Payment Method</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableMethods.map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`p-4 rounded-lg border-2 flex items-center space-x-3 transition-colors ${
                paymentMethod === method
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
              }`}
            >
              {getPaymentMethodIcon(method)}
              <span className="font-medium">{getPaymentMethodLabel(method)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Form */}
      <div className="border rounded-lg p-6">
        {paymentMethod === 'stripe' && (
          <StripePaymentForm
            amount={parseFloat(amount)}
            currency={currency.toLowerCase()}
            description={description}
            onSuccess={onSuccess}
            onError={onError}
            onCancel={onCancel}
          />
        )}

        {paymentMethod === 'paypal' && (
          <PayPalPaymentForm
            amount={parseFloat(amount)}
            currency={currency}
            description={description}
            onSuccess={onSuccess}
            onError={onError}
            onCancel={onCancel}
          />
        )}

        {paymentMethod === 'cash' && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold text-lg">{currency} ${parseFloat(amount).toFixed(2)}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cash Received
              </label>
              <input
                type="number"
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="Enter amount received"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              {cashReceived && parseFloat(cashReceived) >= parseFloat(amount) && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-semibold">
                    Change: {currency} ${(parseFloat(cashReceived) - parseFloat(amount)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCashPayment}
                disabled={!cashReceived || parseFloat(cashReceived) < parseFloat(amount)}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium"
              >
                Complete Cash Payment
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {paymentMethod === 'card' && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">{currency} ${parseFloat(amount).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                💳 Process the card payment using your card terminal, then click Complete Payment.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCardPayment}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium"
              >
                Complete Card Payment
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {paymentMethod === 'bank_transfer' && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">{currency} ${parseFloat(amount).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                🏦 Bank transfer instructions will be provided after confirmation.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBankTransferPayment}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded-lg font-medium"
              >
                Confirm Bank Transfer
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentComponent;

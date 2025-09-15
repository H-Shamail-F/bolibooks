import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import paymentService from '../../services/paymentService';

const PayPalPaymentForm = ({ amount, currency = 'USD', description, onSuccess, onError, onCancel }) => {
  const [paypalConfig, setPaypalConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  useEffect(() => {
    const fetchPayPalConfig = async () => {
      try {
        const statusResult = await paymentService.getPayPalStatus();
        if (statusResult.success && statusResult.data.available) {
          setPaypalConfig({
            'client-id': statusResult.data.clientId,
            currency: currency,
            intent: 'capture'
          });
        }
      } catch (error) {
        onError?.(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayPalConfig();
  }, [currency, onError]);

  const createOrder = async () => {
    try {
      const result = await paymentService.createPayPalOrder({
        amount: parseFloat(amount),
        currency: currency,
        description: description || 'BoliBooks Payment'
      });

      if (result.success) {
        setCurrentOrderId(result.data.paymentId);
        return result.data.orderId;
      } else {
        throw new Error('Failed to create PayPal order');
      }
    } catch (error) {
      onError?.(error.message);
      throw error;
    }
  };

  const onApprove = async (data, actions) => {
    try {
      if (currentOrderId) {
        const result = await paymentService.capturePayPalPayment(currentOrderId);
        
        if (result.success) {
          onSuccess?.({
            orderId: data.orderID,
            paymentId: currentOrderId,
            amount: parseFloat(amount),
            currency: currency,
            status: result.data.status
          });
        } else {
          throw new Error('Payment capture failed');
        }
      }
    } catch (error) {
      onError?.(error.message);
    }
  };

  const onErrorHandler = (err) => {
    console.error('PayPal error:', err);
    onError?.('PayPal payment failed. Please try again.');
  };

  const onCancelHandler = (data) => {
    console.log('PayPal payment cancelled:', data);
    onCancel?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading PayPal...</span>
      </div>
    );
  }

  if (!paypalConfig) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="text-gray-500 mb-2">PayPal is not available</div>
          <p className="text-sm text-gray-400">
            PayPal payment processing is currently unavailable. Please try another payment method.
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Choose Different Payment Method
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Amount:</span>
          <span className="font-semibold">{currency} ${parseFloat(amount).toFixed(2)}</span>
        </div>
        {description && (
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-gray-600">Description:</span>
            <span className="font-medium">{description}</span>
          </div>
        )}
      </div>

      <PayPalScriptProvider options={paypalConfig}>
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal'
          }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onErrorHandler}
          onCancel={onCancelHandler}
        />
      </PayPalScriptProvider>

      <div className="text-xs text-gray-500 text-center">
        <p>🔒 Your payment information is secure</p>
        <p>Powered by PayPal</p>
      </div>

      {onCancel && (
        <div className="pt-2">
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel Payment
          </button>
        </div>
      )}
    </div>
  );
};

export default PayPalPaymentForm;

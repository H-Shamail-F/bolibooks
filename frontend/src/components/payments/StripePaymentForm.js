import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { CreditCardIcon } from '@heroicons/react/24/outline';
import paymentService from '../../services/paymentService';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const PaymentForm = ({ amount, currency = 'usd', description, onSuccess, onError, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState(null);

  useEffect(() => {
    // Create payment intent when component mounts
    const createPaymentIntent = async () => {
      try {
        const result = await paymentService.createStripePaymentIntent({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          description
        });

        if (result.success) {
          setPaymentIntent(result.data);
        }
      } catch (error) {
        onError?.(error.message);
      }
    };

    createPaymentIntent();
  }, [amount, currency, description, onError]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);

      // Confirm payment with card element
      const { error, paymentIntent: confirmedPaymentIntent } = await stripe.confirmCardPayment(
        paymentIntent.clientSecret,
        {
          payment_method: {
            card: cardElement,
          }
        }
      );

      if (error) {
        onError?.(error.message);
      } else {
        // Payment succeeded
        onSuccess?.({
          paymentIntentId: confirmedPaymentIntent.id,
          paymentId: paymentIntent.paymentId,
          amount: amount,
          currency: currency.toUpperCase(),
          status: confirmedPaymentIntent.status
        });
      }
    } catch (error) {
      onError?.(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  if (!paymentIntent) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Preparing payment...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <CreditCardIcon className="h-5 w-5 inline mr-1" />
          Card Details
        </label>
        <div className="p-4 border border-gray-300 rounded-lg bg-white">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Amount:</span>
          <span className="font-semibold">{currency.toUpperCase()} ${amount.toFixed(2)}</span>
        </div>
        {description && (
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-gray-600">Description:</span>
            <span className="font-medium">{description}</span>
          </div>
        )}
      </div>

      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            `Pay ${currency.toUpperCase()} $${amount.toFixed(2)}`
          )}
        </button>
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="text-xs text-gray-500 text-center">
        <p>🔒 Your payment information is secure and encrypted</p>
        <p>Powered by Stripe</p>
      </div>
    </form>
  );
};

const StripePaymentForm = ({ amount, currency, description, onSuccess, onError, onCancel }) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm
        amount={amount}
        currency={currency}
        description={description}
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
      />
    </Elements>
  );
};

export default StripePaymentForm;

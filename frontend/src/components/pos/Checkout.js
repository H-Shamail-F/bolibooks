import React, { useState, useRef } from 'react';
import { PrinterIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import PaymentComponent from '../payments/PaymentComponent';
import paymentService from '../../services/paymentService';

const Checkout = ({ cart, onUpdateCart, onRemoveItem, onClearCart, total }) => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const receiptRef = useRef(null);

  const taxAmount = total * 0.1; // 10% tax
  const finalTotal = total + taxAmount;

  const handlePaymentSuccess = async (paymentResult) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setProcessing(true);

    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name
        })),
        paymentMethod: paymentResult.paymentMethod || 'cash',
        subtotal: total,
        tax: taxAmount,
        total: finalTotal,
        cashReceived: paymentResult.cashReceived || finalTotal,
        change: paymentResult.change || 0,
        paymentData: paymentResult // Store payment processor details
      };

      const result = await paymentService.processPosSale(saleData);
      
      if (result.success) {
        setLastSale(result.data);
        setShowReceipt(true);
        setShowPayment(false);
        onClearCart();
        toast.success('Sale processed successfully!');
      } else {
        toast.error(result.message || 'Failed to process sale');
      }
    } catch (error) {
      console.error('Sale processing error:', error);
      toast.error('Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentError = (error) => {
    toast.error(error);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  const handlePrintReceipt = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { font-family: monospace; margin: 20px; }
              .receipt { max-width: 300px; margin: 0 auto; }
              .center { text-align: center; }
              .line { border-bottom: 1px dashed #000; margin: 10px 0; }
              .total { font-weight: bold; font-size: 1.1em; }
            </style>
          </head>
          <body>
            ${receiptRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (showReceipt && lastSale) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center mb-6">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Sale Complete!</h2>
          <p className="text-gray-600 mt-2">Transaction processed successfully</p>
        </div>

        <div ref={receiptRef} className="receipt bg-gray-50 p-4 rounded-lg mb-6">
          <Receipt sale={lastSale} />
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handlePrintReceipt}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
          >
            <PrinterIcon className="h-5 w-5" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={() => {
              setShowReceipt(false);
              setLastSale(null);
            }}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg"
          >
            New Sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h2>

      {cart.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Add items to cart to begin checkout</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (10%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Actions */}
          {!showPayment ? (
            <div className="flex space-x-4">
              <button
                onClick={() => setShowPayment(true)}
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-semibold text-lg"
              >
                Proceed to Payment - ${finalTotal.toFixed(2)}
              </button>
            </div>
          ) : (
            <PaymentComponent
              amount={finalTotal}
              currency="USD"
              description={`POS Sale - ${cart.length} items`}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onCancel={handlePaymentCancel}
              allowedMethods={['stripe', 'paypal', 'cash', 'card']}
            />
          )}
        </div>
      )}
    </div>
  );
};

const Receipt = ({ sale }) => {
  return (
    <div className="receipt text-sm">
      <div className="center mb-4">
        <h2 className="font-bold text-lg">BoliBooks POS</h2>
        <p>Receipt #{sale.id}</p>
        <p>{new Date(sale.createdAt).toLocaleString()}</p>
      </div>

      <div className="line"></div>

      <div className="mb-4">
        {sale.items.map((item, index) => (
          <div key={index} className="flex justify-between mb-1">
            <span>{item.name} × {item.quantity}</span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="line"></div>

      <div className="space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>${sale.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax:</span>
          <span>${sale.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between total">
          <span>Total:</span>
          <span>${sale.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="line"></div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Payment:</span>
          <span>{sale.paymentMethod.toUpperCase()}</span>
        </div>
        {sale.paymentMethod === 'cash' && (
          <>
            <div className="flex justify-between">
              <span>Cash Received:</span>
              <span>${sale.cashReceived.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Change:</span>
              <span>${sale.change.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      <div className="center mt-4">
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
};

export default Checkout;

import React from 'react';
import { TrashIcon, MinusIcon, PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

const Cart = ({ items, onUpdateItem, onRemoveItem, onClearCart, total }) => {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border h-full">
        <div className="p-6 text-center">
          <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Cart is empty</h3>
          <p className="mt-1 text-sm text-gray-500">Start adding products to your cart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Cart Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </h2>
          <button
            onClick={onClearCart}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {items.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateItem}
            onRemove={onRemoveItem}
          />
        ))}
      </div>

      {/* Cart Footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium">${(total * 0.1).toFixed(2)}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${(total * 1.1).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  const subtotal = item.price * item.quantity;

  return (
    <div className="flex items-start space-x-3 bg-gray-50 rounded-lg p-3">
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
        {item.sku && (
          <p className="text-xs text-gray-500">SKU: {item.sku}</p>
        )}
        <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          disabled={item.quantity <= 1}
        >
          <MinusIcon className="h-4 w-4 text-gray-600" />
        </button>
        
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => {
            const qty = parseInt(e.target.value) || 1;
            onUpdateQuantity(item.id, qty);
          }}
          className="w-16 text-center text-sm border border-gray-300 rounded px-2 py-1"
        />
        
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors"
        >
          <PlusIcon className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Subtotal and Remove */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-900 w-16 text-right">
          ${subtotal.toFixed(2)}
        </span>
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 rounded-full hover:bg-red-100 text-red-600 transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Cart;

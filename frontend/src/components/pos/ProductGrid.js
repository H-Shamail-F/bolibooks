import React, { useState, useEffect } from 'react';
import { PlusIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const ProductGrid = ({ searchTerm, onAddToCart }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else {
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // You might have a categories endpoint, for now we'll derive from products
      const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm)) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === '' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory && product.isActive !== false;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
            <div className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === ''
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
            } border`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
              } border`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Add some products to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProductCard = ({ product, onAddToCart }) => {
  const [imageError, setImageError] = useState(false);

  const handleAddToCart = () => {
    if (product.stockQuantity <= 0) {
      toast.error('Product out of stock');
      return;
    }
    onAddToCart(product);
  };

  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = product.stockQuantity <= (product.lowStockThreshold || 5);

  return (
    <div className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
      isOutOfStock ? 'opacity-75' : ''
    }`}>
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden relative">
        {product.imageUrl && !imageError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {isOutOfStock && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
            <span className="text-white font-semibold">Out of Stock</span>
          </div>
        )}
        
        {!isOutOfStock && isLowStock && (
          <div className="absolute top-2 right-2">
            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
              Low Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
          {product.name}
        </h3>
        
        {product.sku && (
          <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-gray-900">
            ${parseFloat(product.price || 0).toFixed(2)}
          </span>
          <span className="text-sm text-gray-500">
            Stock: {product.stockQuantity || 0}
          </span>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            isOutOfStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <PlusIcon className="h-4 w-4" />
          <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
        </button>
      </div>
    </div>
  );
};

export default ProductGrid;

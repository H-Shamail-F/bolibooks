const crypto = require('crypto');

class BarcodeUtils {
  
  // Generate EAN-13 barcode with checksum
  static generateEAN13(companyPrefix = '123') {
    // Ensure company prefix is 3 digits
    const prefix = companyPrefix.toString().padStart(3, '0').substring(0, 3);
    
    // Generate random 9-digit product code
    const productCode = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    
    // Create first 12 digits
    const first12 = prefix + productCode;
    
    // Calculate check digit using EAN-13 algorithm
    const checkDigit = this.calculateEAN13CheckDigit(first12);
    
    return first12 + checkDigit;
  }

  // Generate EAN-8 barcode (shorter format)
  static generateEAN8(companyPrefix = '12') {
    const prefix = companyPrefix.toString().padStart(2, '0').substring(0, 2);
    const productCode = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const first7 = prefix + productCode;
    const checkDigit = this.calculateEAN8CheckDigit(first7);
    
    return first7 + checkDigit;
  }

  // Generate Code-128 barcode (alphanumeric)
  static generateCode128(prefix = 'POS') {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp.slice(-6)}${random}`;
  }

  // Generate internal barcode for products without standard barcodes
  static generateInternalBarcode(companyId, productId) {
    const companyHash = crypto.createHash('md5').update(companyId).digest('hex').substring(0, 4);
    const productHash = crypto.createHash('md5').update(productId.toString()).digest('hex').substring(0, 6);
    const timestamp = Date.now().toString().slice(-4);
    
    return `INT${companyHash.toUpperCase()}${productHash.toUpperCase()}${timestamp}`;
  }

  // Validate EAN-13 barcode
  static validateEAN13(barcode) {
    if (!/^\d{13}$/.test(barcode)) {
      return { valid: false, error: 'EAN-13 must be exactly 13 digits' };
    }

    const first12 = barcode.substring(0, 12);
    const providedCheckDigit = parseInt(barcode.charAt(12));
    const calculatedCheckDigit = this.calculateEAN13CheckDigit(first12);

    if (providedCheckDigit !== calculatedCheckDigit) {
      return { 
        valid: false, 
        error: `Invalid check digit. Expected ${calculatedCheckDigit}, got ${providedCheckDigit}` 
      };
    }

    return { valid: true };
  }

  // Validate EAN-8 barcode
  static validateEAN8(barcode) {
    if (!/^\d{8}$/.test(barcode)) {
      return { valid: false, error: 'EAN-8 must be exactly 8 digits' };
    }

    const first7 = barcode.substring(0, 7);
    const providedCheckDigit = parseInt(barcode.charAt(7));
    const calculatedCheckDigit = this.calculateEAN8CheckDigit(first7);

    if (providedCheckDigit !== calculatedCheckDigit) {
      return { 
        valid: false, 
        error: `Invalid check digit. Expected ${calculatedCheckDigit}, got ${providedCheckDigit}` 
      };
    }

    return { valid: true };
  }

  // Validate UPC-A barcode
  static validateUPCA(barcode) {
    if (!/^\d{12}$/.test(barcode)) {
      return { valid: false, error: 'UPC-A must be exactly 12 digits' };
    }

    const first11 = barcode.substring(0, 11);
    const providedCheckDigit = parseInt(barcode.charAt(11));
    const calculatedCheckDigit = this.calculateUPCACheckDigit(first11);

    if (providedCheckDigit !== calculatedCheckDigit) {
      return { 
        valid: false, 
        error: `Invalid check digit. Expected ${calculatedCheckDigit}, got ${providedCheckDigit}` 
      };
    }

    return { valid: true };
  }

  // Detect barcode type
  static detectBarcodeType(barcode) {
    barcode = barcode.toString().trim();

    if (/^\d{13}$/.test(barcode)) {
      return { type: 'EAN-13', validation: this.validateEAN13(barcode) };
    }
    
    if (/^\d{8}$/.test(barcode)) {
      return { type: 'EAN-8', validation: this.validateEAN8(barcode) };
    }
    
    if (/^\d{12}$/.test(barcode)) {
      return { type: 'UPC-A', validation: this.validateUPCA(barcode) };
    }

    if (/^INT[A-F0-9]{14}$/.test(barcode)) {
      return { type: 'Internal', validation: { valid: true } };
    }

    if (/^[A-Za-z0-9]+$/.test(barcode)) {
      return { type: 'Code-128', validation: { valid: true } };
    }

    return { 
      type: 'Unknown', 
      validation: { valid: false, error: 'Unrecognized barcode format' } 
    };
  }

  // Calculate EAN-13 check digit
  static calculateEAN13CheckDigit(first12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(first12.charAt(i));
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    return (10 - (sum % 10)) % 10;
  }

  // Calculate EAN-8 check digit
  static calculateEAN8CheckDigit(first7) {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(first7.charAt(i));
      sum += (i % 2 === 0) ? digit * 3 : digit;
    }
    return (10 - (sum % 10)) % 10;
  }

  // Calculate UPC-A check digit
  static calculateUPCACheckDigit(first11) {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(first11.charAt(i));
      sum += (i % 2 === 0) ? digit * 3 : digit;
    }
    return (10 - (sum % 10)) % 10;
  }

  // Format barcode for display (add separators)
  static formatBarcodeForDisplay(barcode, type) {
    switch (type) {
      case 'EAN-13':
        return barcode.replace(/^(\d{1})(\d{6})(\d{6})$/, '$1-$2-$3');
      case 'EAN-8':
        return barcode.replace(/^(\d{4})(\d{4})$/, '$1-$2');
      case 'UPC-A':
        return barcode.replace(/^(\d{1})(\d{5})(\d{5})(\d{1})$/, '$1-$2-$3-$4');
      default:
        return barcode;
    }
  }

  // Generate barcode based on company preferences
  static generateBarcodeForProduct(companyId, productData, preferences = {}) {
    const { 
      type = 'EAN-13',
      companyPrefix,
      useTimestamp = true 
    } = preferences;

    switch (type) {
      case 'EAN-13':
        return this.generateEAN13(companyPrefix);
      case 'EAN-8':
        return this.generateEAN8(companyPrefix);
      case 'Code-128':
        return this.generateCode128(companyPrefix || 'POS');
      case 'Internal':
        return this.generateInternalBarcode(companyId, productData.id || Date.now());
      default:
        return this.generateEAN13(companyPrefix);
    }
  }

  // Batch generate barcodes for multiple products
  static batchGenerateBarcodes(companyId, products, preferences = {}) {
    const generatedBarcodes = new Set(); // Prevent duplicates
    const results = [];

    for (const product of products) {
      let attempts = 0;
      let barcode;
      
      do {
        barcode = this.generateBarcodeForProduct(companyId, product, preferences);
        attempts++;
      } while (generatedBarcodes.has(barcode) && attempts < 10);

      if (attempts >= 10) {
        results.push({
          productId: product.id,
          error: 'Failed to generate unique barcode after 10 attempts'
        });
      } else {
        generatedBarcodes.add(barcode);
        results.push({
          productId: product.id,
          barcode,
          type: this.detectBarcodeType(barcode).type
        });
      }
    }

    return results;
  }
}

module.exports = BarcodeUtils;

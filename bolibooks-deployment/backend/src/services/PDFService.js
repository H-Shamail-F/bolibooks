const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const path = require('path');

class PDFService {
  constructor() {
    this.browser = null;
    this.setupHelpers();
  }

  // Initialize Puppeteer browser instance
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  // Close browser instance
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Setup Handlebars helpers for template rendering
  setupHelpers() {
    // Format currency
    Handlebars.registerHelper('currency', function(amount, currency = 'USD') {
      if (!amount || isNaN(amount)) return '0.00';
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      });
      return formatter.format(parseFloat(amount));
    });

    // Format date
    Handlebars.registerHelper('formatDate', function(date, format = 'en-US') {
      if (!date) return '';
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString(format, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    // Format time
    Handlebars.registerHelper('formatTime', function(date, format = 'en-US') {
      if (!date) return '';
      const dateObj = new Date(date);
      return dateObj.toLocaleTimeString(format, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    });

    // Format number
    Handlebars.registerHelper('formatNumber', function(number, decimals = 2) {
      if (!number || isNaN(number)) return '0';
      return parseFloat(number).toFixed(decimals);
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Math helpers
    Handlebars.registerHelper('add', function(a, b) {
      return parseFloat(a || 0) + parseFloat(b || 0);
    });

    Handlebars.registerHelper('subtract', function(a, b) {
      return parseFloat(a || 0) - parseFloat(b || 0);
    });

    Handlebars.registerHelper('multiply', function(a, b) {
      return parseFloat(a || 0) * parseFloat(b || 0);
    });

    // Generate items table HTML
    Handlebars.registerHelper('itemsTable', function(items, showHeaders = true) {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return '<p>No items</p>';
      }

      let html = '<table class="items-table" style="width: 100%; border-collapse: collapse;">';
      
      if (showHeaders) {
        html += `
          <thead>
            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
              <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Description</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Qty</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Price</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Total</th>
            </tr>
          </thead>
        `;
      }
      
      html += '<tbody>';
      items.forEach((item, index) => {
        const quantity = parseFloat(item.quantity || 0);
        const price = parseFloat(item.price || 0);
        const total = quantity * price;
        
        html += `
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 12px; border: 1px solid #dee2e6;">
              <strong>${item.name || item.description || ''}</strong>
              ${item.description && item.name !== item.description ? `<br><small>${item.description}</small>` : ''}
            </td>
            <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">${quantity}</td>
            <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">$${price.toFixed(2)}</td>
            <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">$${total.toFixed(2)}</td>
          </tr>
        `;
      });
      html += '</tbody></table>';
      
      return new Handlebars.SafeString(html);
    });

    // Generate QR code placeholder
    Handlebars.registerHelper('qrCode', function(text, size = 100) {
      // For now, return a placeholder. In production, you'd integrate with a QR code library
      return new Handlebars.SafeString(
        `<div style="width: ${size}px; height: ${size}px; background-color: #f0f0f0; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;">QR Code<br>${text.substring(0, 20)}...</div>`
      );
    });

    // Amount to words converter (basic implementation)
    Handlebars.registerHelper('amountInWords', function(amount, currency = 'Dollars') {
      return this.numberToWords(parseFloat(amount || 0)) + ' ' + currency;
    });
  }

  // Convert number to words (basic implementation)
  numberToWords(number) {
    if (number === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Million', 'Billion'];
    
    function convertHundreds(num) {
      let result = '';
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num >= 10) {
        result += teens[num - 10] + ' ';
        return result;
      }
      if (num > 0) {
        result += ones[num] + ' ';
      }
      return result;
    }
    
    let result = '';
    let thousandCounter = 0;
    
    while (number > 0) {
      if (number % 1000 !== 0) {
        result = convertHundreds(number % 1000) + thousands[thousandCounter] + ' ' + result;
      }
      number = Math.floor(number / 1000);
      thousandCounter++;
    }
    
    return result.trim();
  }

  // Render template with data
  async renderTemplate(template, data) {
    try {
      // Compile the template
      const compiledTemplate = Handlebars.compile(template.htmlTemplate);
      
      // Render with data
      const html = compiledTemplate(data);
      
      return html;
    } catch (error) {
      console.error('Error rendering template:', error);
      throw new Error('Failed to render template');
    }
  }

  // Generate PDF from template and data
  async generatePDF(template, documentData) {
    let page = null;
    
    try {
      // Initialize browser if needed
      const browser = await this.initBrowser();
      
      // Prepare data for template
      const templateData = this.prepareTemplateData(documentData);
      
      // Render HTML from template
      const html = await this.renderTemplate(template, templateData);
      
      // Create full HTML document with CSS
      const fullHtml = this.createFullHTML(html, template.cssStyles);
      
      // Create new page
      page = await browser.newPage();
      
      // Set content
      await page.setContent(fullHtml, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Configure PDF options
      const pdfOptions = {
        format: template.paperSize || 'A4',
        landscape: template.orientation === 'landscape',
        margin: template.margins || {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true,
        preferCSSPageSize: true
      };
      
      // Add watermark if specified
      if (template.watermark && template.watermark.text) {
        await this.addWatermark(page, template.watermark);
      }
      
      // Generate PDF
      const pdfBuffer = await page.pdf(pdfOptions);
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  // Create full HTML document with CSS
  createFullHTML(bodyHtml, css) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>
          /* Reset styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
          }
          
          .page-break {
            page-break-after: always;
          }
          
          /* Custom styles */
          ${css || ''}
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
      </html>
    `;
  }

  // Add watermark to page
  async addWatermark(page, watermark) {
    const { text, opacity = 0.1, position = 'center', fontSize = 48, color = '#000000' } = watermark;
    
    await page.evaluate((watermarkConfig) => {
      const watermarkDiv = document.createElement('div');
      watermarkDiv.innerHTML = watermarkConfig.text;
      watermarkDiv.style.position = 'fixed';
      watermarkDiv.style.top = '50%';
      watermarkDiv.style.left = '50%';
      watermarkDiv.style.transform = 'translate(-50%, -50%) rotate(-45deg)';
      watermarkDiv.style.fontSize = watermarkConfig.fontSize + 'px';
      watermarkDiv.style.color = watermarkConfig.color;
      watermarkDiv.style.opacity = watermarkConfig.opacity;
      watermarkDiv.style.zIndex = '1000';
      watermarkDiv.style.pointerEvents = 'none';
      watermarkDiv.style.fontWeight = 'bold';
      watermarkDiv.style.textTransform = 'uppercase';
      
      document.body.appendChild(watermarkDiv);
    }, watermark);
  }

  // Prepare document data for template rendering
  prepareTemplateData(document) {
    const data = {
      // Document info
      document_number: document.number || document.id,
      document_date: document.date || document.createdAt,
      due_date: document.dueDate,
      status: document.status,
      
      // Company info
      company_name: document.company?.name || '',
      company_address: document.company?.address || '',
      company_phone: document.company?.phone || '',
      company_email: document.company?.email || '',
      company_website: document.company?.website || '',
      company_tax_id: document.company?.taxId || '',
      company_logo: document.company?.logoUrl || '',
      
      // Customer info
      customer_name: document.customer?.name || '',
      customer_email: document.customer?.email || '',
      customer_phone: document.customer?.phone || '',
      customer_address: document.customer?.address || '',
      
      // Financial info
      subtotal: document.subtotal || 0,
      tax_amount: document.taxAmount || 0,
      tax_rate: document.taxRate || 0,
      discount_amount: document.discountAmount || 0,
      total_amount: document.totalAmount || document.total || 0,
      currency: document.currency || 'USD',
      
      // Items
      items: document.items || [],
      
      // Additional info
      notes: document.notes || '',
      terms_and_conditions: document.termsAndConditions || '',
      payment_instructions: document.paymentInstructions || '',
      
      // Calculated fields
      balance_due: document.balanceDue || document.totalAmount || document.total || 0,
      amount_in_words: '', // Will be calculated by helper
      
      // Meta info
      created_date: new Date().toISOString(),
      invoice: document.type === 'invoice' ? document : null,
      quote: document.type === 'quote' ? document : null
    };
    
    // Add type-specific data
    if (document.type === 'quote') {
      data.validity_date = document.validityDate;
      data.quote_reference = document.referenceNumber;
    } else if (document.type === 'invoice') {
      data.payment_link = document.paymentLink;
    }
    
    return data;
  }

  // Generate sample data for template preview
  getSampleData(type, company) {
    const baseData = {
      // Company info
      company_name: company?.name || 'Acme Corporation',
      company_address: company?.address || '123 Business St\nCity, State 12345',
      company_phone: company?.phone || '+1 (555) 123-4567',
      company_email: company?.email || 'info@acmecorp.com',
      company_website: company?.website || 'www.acmecorp.com',
      company_tax_id: company?.taxId || 'TAX123456789',
      company_logo: company?.logoUrl || '',
      
      // Customer info
      customer_name: 'Sample Customer Ltd.',
      customer_email: 'customer@example.com',
      customer_phone: '+1 (555) 987-6543',
      customer_address: '456 Client Ave\nCustomer City, State 67890',
      
      // Document info
      document_number: type === 'invoice' ? 'INV-2024-001' : 'QUO-2024-001',
      document_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: type === 'invoice' ? 'Pending' : 'Draft',
      
      // Sample items
      items: [
        {
          name: 'Web Development Service',
          description: 'Custom website development with responsive design',
          quantity: 40,
          price: 75.00
        },
        {
          name: 'SEO Optimization',
          description: 'Search engine optimization for better visibility',
          quantity: 20,
          price: 50.00
        },
        {
          name: 'Hosting Setup',
          description: 'Annual hosting and domain setup',
          quantity: 1,
          price: 200.00
        }
      ],
      
      // Financial info
      subtotal: 4200.00,
      tax_rate: 8.5,
      tax_amount: 357.00,
      discount_amount: 0,
      total_amount: 4557.00,
      balance_due: 4557.00,
      currency: 'USD',
      
      // Additional info
      notes: 'Thank you for your business! Payment terms: Net 30 days.',
      terms_and_conditions: 'Payment is due within 30 days. Late payments may incur additional charges.',
      payment_instructions: 'Please remit payment to the address above or use online payment options.',
      
      // Meta info
      created_date: new Date().toISOString()
    };
    
    // Add type-specific data
    if (type === 'quote') {
      baseData.validity_date = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      baseData.quote_reference = 'REF-QUO-2024-001';
    } else if (type === 'invoice') {
      baseData.payment_link = 'https://pay.acmecorp.com/invoice/INV-2024-001';
    }
    
    return baseData;
  }

  // Create default templates for a company
  async createDefaultTemplates(companyId, userId) {
    const { Template } = require('../models');
    
    const defaultTemplates = [
      {
        companyId,
        name: 'Modern Invoice',
        type: 'invoice',
        category: 'modern',
        htmlTemplate: this.getDefaultInvoiceTemplate(),
        cssStyles: this.getDefaultInvoiceStyles(),
        isDefault: true,
        createdBy: userId
      },
      {
        companyId,
        name: 'Professional Quote',
        type: 'quote',
        category: 'professional',
        htmlTemplate: this.getDefaultQuoteTemplate(),
        cssStyles: this.getDefaultQuoteStyles(),
        isDefault: true,
        createdBy: userId
      },
      {
        companyId,
        name: 'Thermal Receipt',
        type: 'receipt',
        category: 'minimal',
        htmlTemplate: this.getDefaultReceiptTemplate(),
        cssStyles: this.getDefaultReceiptStyles(),
        printerType: 'thermal',
        printerWidth: 80,
        isDefault: true,
        createdBy: userId
      }
    ];
    
    try {
      const createdTemplates = await Template.bulkCreate(defaultTemplates);
      return createdTemplates;
    } catch (error) {
      console.error('Error creating default templates:', error);
      throw error;
    }
  }

  // Default invoice template
  getDefaultInvoiceTemplate() {
    return `
    <div class="invoice-container">
      <header class="invoice-header">
        <div class="company-info">
          {{#if company_logo}}
          <img src="{{company_logo}}" alt="Company Logo" class="company-logo">
          {{/if}}
          <h1>{{company_name}}</h1>
          <div class="company-details">
            <p>{{company_address}}</p>
            <p>Phone: {{company_phone}}</p>
            <p>Email: {{company_email}}</p>
            {{#if company_website}}<p>Web: {{company_website}}</p>{{/if}}
            {{#if company_tax_id}}<p>Tax ID: {{company_tax_id}}</p>{{/if}}
          </div>
        </div>
        <div class="invoice-info">
          <h2>INVOICE</h2>
          <p><strong>Invoice #:</strong> {{document_number}}</p>
          <p><strong>Date:</strong> {{formatDate document_date}}</p>
          <p><strong>Due Date:</strong> {{formatDate due_date}}</p>
          <p><strong>Status:</strong> <span class="status">{{status}}</span></p>
        </div>
      </header>

      <section class="billing-info">
        <div class="bill-to">
          <h3>Bill To:</h3>
          <p><strong>{{customer_name}}</strong></p>
          <p>{{customer_address}}</p>
          {{#if customer_phone}}<p>Phone: {{customer_phone}}</p>{{/if}}
          {{#if customer_email}}<p>Email: {{customer_email}}</p>{{/if}}
        </div>
      </section>

      <section class="invoice-items">
        {{{itemsTable items}}}
      </section>

      <section class="invoice-totals">
        <div class="totals-table">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>{{currency subtotal}}</span>
          </div>
          {{#if discount_amount}}
          <div class="total-row">
            <span>Discount:</span>
            <span>-{{currency discount_amount}}</span>
          </div>
          {{/if}}
          {{#if tax_amount}}
          <div class="total-row">
            <span>Tax ({{formatNumber tax_rate}}%):</span>
            <span>{{currency tax_amount}}</span>
          </div>
          {{/if}}
          <div class="total-row total-final">
            <span><strong>Total Amount:</strong></span>
            <span><strong>{{currency total_amount}}</strong></span>
          </div>
          {{#if balance_due}}
          <div class="total-row balance-due">
            <span><strong>Balance Due:</strong></span>
            <span><strong>{{currency balance_due}}</strong></span>
          </div>
          {{/if}}
        </div>
      </section>

      {{#if notes}}
      <section class="notes">
        <h3>Notes:</h3>
        <p>{{notes}}</p>
      </section>
      {{/if}}

      {{#if terms_and_conditions}}
      <section class="terms">
        <h3>Terms & Conditions:</h3>
        <p>{{terms_and_conditions}}</p>
      </section>
      {{/if}}

      <footer class="invoice-footer">
        <p>Thank you for your business!</p>
        {{#if payment_instructions}}
        <p>{{payment_instructions}}</p>
        {{/if}}
      </footer>
    </div>
    `;
  }

  // Default invoice styles
  getDefaultInvoiceStyles() {
    return `
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: Arial, sans-serif;
      color: #333;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3B82F6;
    }

    .company-info h1 {
      color: #3B82F6;
      margin-bottom: 10px;
      font-size: 28px;
    }

    .company-logo {
      max-width: 150px;
      max-height: 80px;
      margin-bottom: 10px;
    }

    .company-details p {
      margin: 2px 0;
      font-size: 14px;
    }

    .invoice-info {
      text-align: right;
    }

    .invoice-info h2 {
      color: #3B82F6;
      font-size: 32px;
      margin-bottom: 10px;
    }

    .invoice-info p {
      margin: 5px 0;
    }

    .status {
      background-color: #FEF3C7;
      color: #D97706;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .billing-info {
      margin-bottom: 30px;
    }

    .bill-to h3 {
      color: #3B82F6;
      margin-bottom: 10px;
    }

    .bill-to p {
      margin: 3px 0;
    }

    .invoice-items {
      margin-bottom: 30px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th,
    .items-table td {
      padding: 12px;
      text-align: left;
      border: 1px solid #E5E7EB;
    }

    .items-table th {
      background-color: #F3F4F6;
      font-weight: bold;
      color: #374151;
    }

    .items-table td:nth-child(2),
    .items-table td:nth-child(3),
    .items-table td:nth-child(4) {
      text-align: right;
    }

    .invoice-totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }

    .totals-table {
      width: 300px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #E5E7EB;
    }

    .total-final {
      font-size: 18px;
      font-weight: bold;
      border-bottom: 2px solid #3B82F6;
      color: #3B82F6;
    }

    .balance-due {
      font-size: 16px;
      font-weight: bold;
      color: #DC2626;
      border-bottom: none;
      padding-top: 12px;
    }

    .notes,
    .terms {
      margin-bottom: 20px;
    }

    .notes h3,
    .terms h3 {
      color: #3B82F6;
      margin-bottom: 10px;
    }

    .invoice-footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      font-style: italic;
      color: #6B7280;
    }
    `;
  }

  // Default quote template
  getDefaultQuoteTemplate() {
    return `
    <div class="quote-container">
      <header class="quote-header">
        <div class="company-info">
          {{#if company_logo}}
          <img src="{{company_logo}}" alt="Company Logo" class="company-logo">
          {{/if}}
          <h1>{{company_name}}</h1>
          <div class="company-details">
            <p>{{company_address}}</p>
            <p>Phone: {{company_phone}}</p>
            <p>Email: {{company_email}}</p>
            {{#if company_website}}<p>Web: {{company_website}}</p>{{/if}}
            {{#if company_tax_id}}<p>Tax ID: {{company_tax_id}}</p>{{/if}}
          </div>
        </div>
        <div class="quote-info">
          <h2>QUOTE</h2>
          <p><strong>Quote #:</strong> {{document_number}}</p>
          <p><strong>Date:</strong> {{formatDate document_date}}</p>
          <p><strong>Valid Until:</strong> {{formatDate validity_date}}</p>
          <p><strong>Status:</strong> <span class="status">{{status}}</span></p>
        </div>
      </header>

      <section class="customer-info">
        <div class="quote-for">
          <h3>Quote For:</h3>
          <p><strong>{{customer_name}}</strong></p>
          <p>{{customer_address}}</p>
          {{#if customer_phone}}<p>Phone: {{customer_phone}}</p>{{/if}}
          {{#if customer_email}}<p>Email: {{customer_email}}</p>{{/if}}
        </div>
      </section>

      <section class="quote-items">
        {{{itemsTable items}}}
      </section>

      <section class="quote-totals">
        <div class="totals-table">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>{{currency subtotal}}</span>
          </div>
          {{#if discount_amount}}
          <div class="total-row">
            <span>Discount:</span>
            <span>-{{currency discount_amount}}</span>
          </div>
          {{/if}}
          {{#if tax_amount}}
          <div class="total-row">
            <span>Tax ({{formatNumber tax_rate}}%):</span>
            <span>{{currency tax_amount}}</span>
          </div>
          {{/if}}
          <div class="total-row total-final">
            <span><strong>Total Quote:</strong></span>
            <span><strong>{{currency total_amount}}</strong></span>
          </div>
        </div>
      </section>

      {{#if notes}}
      <section class="notes">
        <h3>Additional Information:</h3>
        <p>{{notes}}</p>
      </section>
      {{/if}}

      {{#if terms_and_conditions}}
      <section class="terms">
        <h3>Terms & Conditions:</h3>
        <p>{{terms_and_conditions}}</p>
      </section>
      {{/if}}

      <footer class="quote-footer">
        <p>This quote is valid until {{formatDate validity_date}}</p>
        <p>Thank you for considering our services!</p>
      </footer>
    </div>
    `;
  }

  // Default quote styles
  getDefaultQuoteStyles() {
    return `
    .quote-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: Arial, sans-serif;
      color: #333;
    }

    .quote-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #10B981;
    }

    .company-info h1 {
      color: #10B981;
      margin-bottom: 10px;
      font-size: 28px;
    }

    .company-logo {
      max-width: 150px;
      max-height: 80px;
      margin-bottom: 10px;
    }

    .company-details p {
      margin: 2px 0;
      font-size: 14px;
    }

    .quote-info {
      text-align: right;
    }

    .quote-info h2 {
      color: #10B981;
      font-size: 32px;
      margin-bottom: 10px;
    }

    .quote-info p {
      margin: 5px 0;
    }

    .status {
      background-color: #D1FAE5;
      color: #065F46;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .customer-info {
      margin-bottom: 30px;
    }

    .quote-for h3 {
      color: #10B981;
      margin-bottom: 10px;
    }

    .quote-for p {
      margin: 3px 0;
    }

    .quote-items {
      margin-bottom: 30px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th,
    .items-table td {
      padding: 12px;
      text-align: left;
      border: 1px solid #E5E7EB;
    }

    .items-table th {
      background-color: #F0FDF4;
      font-weight: bold;
      color: #065F46;
    }

    .items-table td:nth-child(2),
    .items-table td:nth-child(3),
    .items-table td:nth-child(4) {
      text-align: right;
    }

    .quote-totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }

    .totals-table {
      width: 300px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #E5E7EB;
    }

    .total-final {
      font-size: 18px;
      font-weight: bold;
      border-bottom: 2px solid #10B981;
      color: #10B981;
    }

    .notes,
    .terms {
      margin-bottom: 20px;
    }

    .notes h3,
    .terms h3 {
      color: #10B981;
      margin-bottom: 10px;
    }

    .quote-footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      font-style: italic;
      color: #6B7280;
    }
    `;
  }

  // Default receipt template for POS
  getDefaultReceiptTemplate() {
    return `
    <div class="receipt-container">
      <header class="receipt-header">
        <div class="company-info">
          <h1>{{company_name}}</h1>
          {{#if company_address}}<p>{{company_address}}</p>{{/if}}
          {{#if company_phone}}<p>Tel: {{company_phone}}</p>{{/if}}
          {{#if company_email}}<p>{{company_email}}</p>{{/if}}
        </div>
        <div class="receipt-info">
          <p><strong>Receipt #:</strong> {{sale_number}}</p>
          <p><strong>Date:</strong> {{formatDate receipt_timestamp}}</p>
          <p><strong>Cashier:</strong> {{cashier_name}}</p>
          <p><strong>Terminal:</strong> {{terminal_id}}</p>
        </div>
      </header>

      {{#if customer_name}}
      <section class="customer-info">
        <p><strong>Customer:</strong> {{customer_name}}</p>
        {{#if customer_phone}}<p>Phone: {{customer_phone}}</p>{{/if}}
      </section>
      {{/if}}

      <section class="receipt-items">
        <div class="items-header">
          <span>Item</span>
          <span>Qty</span>
          <span>Price</span>
          <span>Total</span>
        </div>
        {{#each items}}
        <div class="item-row">
          <span class="item-name">{{this.name}}</span>
          <span class="item-qty">{{this.quantity}}</span>
          <span class="item-price">{{currency this.price}}</span>
          <span class="item-total">{{currency this.lineTotal}}</span>
        </div>
        {{/each}}
      </section>

      <section class="receipt-totals">
        <div class="total-line">
          <span>Subtotal:</span>
          <span>{{currency subtotal}}</span>
        </div>
        {{#if tax_amount}}
        <div class="total-line">
          <span>Tax:</span>
          <span>{{currency tax_amount}}</span>
        </div>
        {{/if}}
        <div class="total-line total-final">
          <span><strong>TOTAL:</strong></span>
          <span><strong>{{currency total_amount}}</strong></span>
        </div>
        
        {{#if amount_tendered}}
        <div class="payment-info">
          <div class="total-line">
            <span>{{payment_method}} Tendered:</span>
            <span>{{currency amount_tendered}}</span>
          </div>
          {{#if change_given}}
          <div class="total-line">
            <span>Change:</span>
            <span>{{currency change_given}}</span>
          </div>
          {{/if}}
        </div>
        {{else}}
        <div class="payment-info">
          <div class="total-line">
            <span>Payment Method:</span>
            <span>{{payment_method}}</span>
          </div>
        </div>
        {{/if}}
      </section>

      <footer class="receipt-footer">
        <p>Thank you for your business!</p>
        <p>Transaction ID: {{transaction_id}}</p>
        <p>{{formatDate receipt_timestamp 'en-US'}} {{formatTime receipt_timestamp}}</p>
      </footer>
    </div>
    `;
  }

  // Default receipt styles for thermal printers
  getDefaultReceiptStyles() {
    return `
    .receipt-container {
      width: 72mm;
      margin: 0;
      padding: 4mm;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.2;
      color: #000;
    }

    .receipt-header {
      text-align: center;
      margin-bottom: 8px;
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
    }

    .company-info h1 {
      font-size: 16px;
      font-weight: bold;
      margin: 0 0 4px 0;
    }

    .company-info p {
      margin: 2px 0;
      font-size: 11px;
    }

    .receipt-info {
      margin-top: 8px;
    }

    .receipt-info p {
      margin: 2px 0;
      font-size: 11px;
    }

    .customer-info {
      margin: 8px 0;
      padding: 4px 0;
      border-bottom: 1px dashed #000;
    }

    .customer-info p {
      margin: 2px 0;
      font-size: 11px;
    }

    .receipt-items {
      margin: 8px 0;
    }

    .items-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
      margin-bottom: 4px;
      font-size: 10px;
    }

    .item-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 10px;
    }

    .item-name {
      flex: 2;
      text-align: left;
    }

    .item-qty {
      flex: 0.5;
      text-align: center;
    }

    .item-price {
      flex: 1;
      text-align: right;
    }

    .item-total {
      flex: 1;
      text-align: right;
    }

    .receipt-totals {
      margin-top: 8px;
      border-top: 1px dashed #000;
      padding-top: 8px;
    }

    .total-line {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
      font-size: 11px;
    }

    .total-final {
      font-size: 14px;
      font-weight: bold;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 4px 0;
      margin: 4px 0;
    }

    .payment-info {
      margin-top: 8px;
      border-top: 1px dashed #000;
      padding-top: 4px;
    }

    .receipt-footer {
      text-align: center;
      margin-top: 8px;
      border-top: 1px dashed #000;
      padding-top: 8px;
      font-size: 10px;
    }

    .receipt-footer p {
      margin: 2px 0;
    }

    /* Print specific styles */
    @media print {
      .receipt-container {
        width: 72mm;
        margin: 0;
        padding: 0;
      }
      
      body {
        margin: 0;
        padding: 0;
      }
    }
    `;
  }
}

// Export singleton instance
module.exports = new PDFService();

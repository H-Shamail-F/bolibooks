const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Template = sequelize.define('Template', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: true, // null for global templates
      references: {
        model: 'companies',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    type: {
      type: DataTypes.ENUM('invoice', 'quote', 'receipt'),
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('modern', 'classic', 'minimal', 'professional', 'creative'),
      defaultValue: 'modern'
    },
    language: {
      type: DataTypes.ENUM('en', 'dv'),
      defaultValue: 'en'
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isGlobal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false // true for system-provided templates
    },
    preview: {
      type: DataTypes.STRING, // URL to preview image
      allowNull: true
    },
    htmlTemplate: {
      type: DataTypes.TEXT,
      allowNull: false,
      // HTML template with placeholders like {{company_name}}, {{items_table}}, etc.
    },
    cssStyles: {
      type: DataTypes.TEXT,
      allowNull: false,
      // CSS styles for the template
    },
    configuration: {
      type: DataTypes.JSON,
      defaultValue: {},
      // Template configuration like colors, fonts, layout options
      // Example: { primaryColor: '#3B82F6', showLogo: true, showTerms: true }
    },
    fields: {
      type: DataTypes.JSON,
      defaultValue: {},
      // Field visibility and customization
      // Example: { customerAddress: true, dueDate: true, notes: false }
    },
    placeholders: {
      type: DataTypes.JSON,
      defaultValue: {},
      // Available placeholders and their descriptions
    },
    paperSize: {
      type: DataTypes.ENUM('A4', 'Letter', 'A5'),
      defaultValue: 'A4'
    },
    orientation: {
      type: DataTypes.ENUM('portrait', 'landscape'),
      defaultValue: 'portrait'
    },
    margins: {
      type: DataTypes.JSON,
      defaultValue: { top: 20, right: 20, bottom: 20, left: 20 }
    },
    watermark: {
      type: DataTypes.JSON,
      defaultValue: null,
      // Watermark configuration { text: 'DRAFT', opacity: 0.1, position: 'center' }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    version: {
      type: DataTypes.STRING,
      defaultValue: '1.0'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'templates',
    indexes: [
      {
        fields: ['companyId', 'type']
      },
      {
        fields: ['type', 'isGlobal']
      },
      {
        fields: ['isDefault']
      }
    ],
    hooks: {
      beforeCreate: (template) => {
        // Set default placeholders based on type
        if (!template.placeholders || Object.keys(template.placeholders).length === 0) {
          template.placeholders = getDefaultPlaceholders(template.type);
        }
      }
    }
  });

  return Template;
};

// Default placeholders for different template types
function getDefaultPlaceholders(type) {
  const commonPlaceholders = {
    // Company info
    '{{company_name}}': 'Company name',
    '{{company_address}}': 'Company address',
    '{{company_phone}}': 'Company phone number',
    '{{company_email}}': 'Company email',
    '{{company_website}}': 'Company website',
    '{{company_logo}}': 'Company logo image',
    '{{company_tax_id}}': 'Company tax ID',

    // Customer info
    '{{customer_name}}': 'Customer name',
    '{{customer_email}}': 'Customer email',
    '{{customer_phone}}': 'Customer phone',
    '{{customer_address}}': 'Customer address',

    // Document info
    '{{document_number}}': 'Document number (invoice/quote)',
    '{{document_date}}': 'Document issue date',
    '{{due_date}}': 'Payment due date',
    '{{status}}': 'Document status',

    // Financial info
    '{{items_table}}': 'Items/services table',
    '{{subtotal}}': 'Subtotal amount',
    '{{tax_amount}}': 'Tax/GST amount',
    '{{tax_rate}}': 'Tax/GST rate',
    '{{discount_amount}}': 'Discount amount',
    '{{total_amount}}': 'Total amount',
    '{{amount_in_words}}': 'Amount in words',
    '{{currency}}': 'Currency symbol',

    // Additional info
    '{{notes}}': 'Additional notes',
    '{{terms_and_conditions}}': 'Terms and conditions',
    '{{payment_instructions}}': 'Payment instructions'
  };

  const invoiceSpecific = {
    '{{payment_link}}': 'Online payment link',
    '{{qr_code}}': 'Payment QR code',
    '{{balance_due}}': 'Outstanding balance'
  };

  const quoteSpecific = {
    '{{validity_date}}': 'Quote validity date',
    '{{quote_reference}}': 'Quote reference number'
  };

  if (type === 'invoice') {
    return { ...commonPlaceholders, ...invoiceSpecific };
  } else if (type === 'quote') {
    return { ...commonPlaceholders, ...quoteSpecific };
  }

  return commonPlaceholders;
}

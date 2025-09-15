const express = require('express');
const router = express.Router();
const { models } = require('../database');
const { Op } = require('sequelize');
const { authMiddleware } = require('../middleware/auth');
const PDFService = require('../services/PDFService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// File upload configuration for template assets
const upload = multer({
  dest: 'uploads/template-assets/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// Get all templates for company
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type, category, isGlobal } = req.query;
    const whereClause = {
      isActive: true
    };

    // Add filters
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (isGlobal !== undefined) {
      whereClause.isGlobal = isGlobal === 'true';
    }

    // If not requesting global templates, include company templates
    if (isGlobal !== 'true') {
      whereClause[Op.or] = [
        { companyId: req.user.companyId },
        { isGlobal: true }
      ];
    }

    const templates = await models.Template.findAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['isDefault', 'DESC'], ['usageCount', 'DESC'], ['updatedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    });
  }
});

// Get template by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const template = await models.Template.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { companyId: req.user.companyId },
          { isGlobal: true }
        ]
      },
      include: [
        {
          model: models.User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template'
    });
  }
});

// Create new template
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      type,
      category,
      language,
      htmlTemplate,
      cssStyles,
      configuration,
      fields,
      paperSize,
      orientation,
      margins,
      watermark
    } = req.body;

    // Validation
    if (!name || !type || !htmlTemplate || !cssStyles) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, HTML template and CSS styles are required'
      });
    }

    const template = await models.Template.create({
      companyId: req.user.companyId,
      name,
      type,
      category: category || 'modern',
      language: language || 'en',
      htmlTemplate,
      cssStyles,
      configuration: configuration || {},
      fields: fields || {},
      paperSize: paperSize || 'A4',
      orientation: orientation || 'portrait',
      margins: margins || { top: 20, right: 20, bottom: 20, left: 20 },
      watermark,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template'
    });
  }
});

// Update template
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const template = await models.Template.findOne({
      where: {
        id: req.params.id,
        companyId: req.user.companyId
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied'
      });
    }

    const updatedTemplate = await template.update(req.body);

    res.json({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template'
    });
  }
});

// Delete template
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const template = await models.Template.findOne({
      where: {
        id: req.params.id,
        companyId: req.user.companyId
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied'
      });
    }

    await template.update({ isActive: false });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template'
    });
  }
});

// Set default template
router.post('/:id/set-default', authMiddleware, async (req, res) => {
  try {
    const template = await models.Template.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { companyId: req.user.companyId },
          { isGlobal: true }
        ]
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Remove default from other templates of same type
    await models.Template.update(
      { isDefault: false },
      {
        where: {
          type: template.type,
          companyId: req.user.companyId
        }
      }
    );

    // Set this template as default
    await template.update({ isDefault: true });

    res.json({
      success: true,
      message: 'Default template updated successfully'
    });
  } catch (error) {
    console.error('Error setting default template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default template'
    });
  }
});

// Clone template
router.post('/:id/clone', authMiddleware, async (req, res) => {
  try {
    const originalTemplate = await models.Template.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { companyId: req.user.companyId },
          { isGlobal: true }
        ]
      }
    });

    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const clonedTemplate = await models.Template.create({
      companyId: req.user.companyId,
      name: `${originalTemplate.name} (Copy)`,
      type: originalTemplate.type,
      category: originalTemplate.category,
      language: originalTemplate.language,
      htmlTemplate: originalTemplate.htmlTemplate,
      cssStyles: originalTemplate.cssStyles,
      configuration: originalTemplate.configuration,
      fields: originalTemplate.fields,
      paperSize: originalTemplate.paperSize,
      orientation: originalTemplate.orientation,
      margins: originalTemplate.margins,
      watermark: originalTemplate.watermark,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: clonedTemplate,
      message: 'Template cloned successfully'
    });
  } catch (error) {
    console.error('Error cloning template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clone template'
    });
  }
});

// Preview template with sample data
router.post('/:id/preview', authMiddleware, async (req, res) => {
  try {
    const template = await models.Template.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { companyId: req.user.companyId },
          { isGlobal: true }
        ]
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Get company info for template data
    const company = await models.Company.findByPk(req.user.companyId);
    
    // Create sample data based on template type
    const sampleData = PDFService.getSampleData(template.type, company);
    
    // Generate preview HTML
    const previewHtml = await PDFService.renderTemplate(template, sampleData);
    
    res.json({
      success: true,
      data: {
        html: previewHtml,
        css: template.cssStyles
      }
    });
  } catch (error) {
    console.error('Error generating template preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template preview'
    });
  }
});

// Generate PDF from template
router.post('/:templateId/generate-pdf/:documentType/:documentId', authMiddleware, async (req, res) => {
  try {
    const { templateId, documentType, documentId } = req.params;
    const { filename } = req.body;

    // Validate document type
    if (!['invoice', 'quote'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    // Get template
    const template = await models.Template.findOne({
      where: {
        id: templateId,
        type: documentType,
        [Op.or]: [
          { companyId: req.user.companyId },
          { isGlobal: true }
        ]
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Get document data
    let document;
    if (documentType === 'invoice') {
      document = await models.Invoice.findOne({
        where: { id: documentId, companyId: req.user.companyId },
        include: ['customer', 'items', 'company']
      });
    } else if (documentType === 'quote') {
      document = await models.Quote.findOne({
        where: { id: documentId, companyId: req.user.companyId },
        include: ['customer', 'items', 'company']
      });
    }

    if (!document) {
      return res.status(404).json({
        success: false,
        message: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} not found`
      });
    }

    // Generate PDF
    const pdfBuffer = await PDFService.generatePDF(template, document);
    
    // Update template usage count
    await template.increment('usageCount');

    // Set response headers
    const pdfFilename = filename || `${documentType}-${document.number || document.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF'
    });
  }
});

// Upload template asset (logo, images, etc.)
router.post('/assets/upload', authMiddleware, upload.single('asset'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Generate unique filename
    const fileExtension = path.extname(req.file.originalname);
    const uniqueFilename = `${req.user.companyId}-${Date.now()}${fileExtension}`;
    const finalPath = path.join('uploads/template-assets', uniqueFilename);

    // Move file to final location
    await fs.rename(req.file.path, finalPath);

    const assetUrl = `/api/templates/assets/${uniqueFilename}`;

    res.json({
      success: true,
      data: {
        filename: uniqueFilename,
        originalName: req.file.originalname,
        url: assetUrl,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Error uploading template asset:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload asset'
    });
  }
});

// Serve template assets
router.get('/assets/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../../uploads/template-assets', req.params.filename);
  res.sendFile(path.resolve(filePath), (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
  });
});

// Get template statistics
router.get('/stats/usage', authMiddleware, async (req, res) => {
  try {
    
    const stats = await models.Template.findAll({
      where: {
        companyId: req.user.companyId,
        isActive: true
      },
      attributes: [
        'id',
        'name', 
        'type',
        'usageCount',
        'isDefault'
      ],
      order: [['usageCount', 'DESC']]
    });

    const summary = {
      totalTemplates: stats.length,
      mostUsed: stats[0] || null,
      defaultTemplates: stats.filter(t => t.isDefault),
      byType: {
        invoice: stats.filter(t => t.type === 'invoice').length,
        quote: stats.filter(t => t.type === 'quote').length,
        receipt: stats.filter(t => t.type === 'receipt').length
      }
    };

    res.json({
      success: true,
      data: {
        templates: stats,
        summary
      }
    });
  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template statistics'
    });
  }
});

module.exports = router;

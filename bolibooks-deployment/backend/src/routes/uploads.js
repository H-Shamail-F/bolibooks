const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Configure storage for different file types
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = getUploadPath(req.params.type || 'general');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const companyPrefix = req.user.companyId + '-';
    cb(null, companyPrefix + uniqueSuffix + path.extname(file.originalname));
  }
});

// File type validation
const fileFilter = function (req, file, cb) {
  const allowedTypes = getAllowedTypes(req.params.type || 'general');
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  // Check file extension
  if (!allowedTypes.extensions.includes(fileExtension)) {
    return cb(new Error(`File type ${fileExtension} not allowed. Allowed types: ${allowedTypes.extensions.join(', ')}`));
  }

  // Check MIME type
  const isValidMime = allowedTypes.mimeTypes.some(type => mimeType.includes(type));
  if (!isValidMime) {
    return cb(new Error(`MIME type ${mimeType} not allowed`));
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper functions
function getUploadPath(type) {
  const basePath = 'uploads/';
  switch (type) {
    case 'logos':
      return basePath + 'logos/';
    case 'receipts':
      return basePath + 'receipts/';
    case 'attachments':
      return basePath + 'attachments/';
    case 'products':
      return basePath + 'products/';
    case 'documents':
      return basePath + 'documents/';
    default:
      return basePath + 'general/';
  }
}

function getAllowedTypes(type) {
  const imageTypes = {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    mimeTypes: ['image']
  };

  const documentTypes = {
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    mimeTypes: ['pdf', 'document', 'text']
  };

  const dataTypes = {
    extensions: ['.csv', '.xlsx', '.xls'],
    mimeTypes: ['csv', 'spreadsheet', 'excel']
  };

  switch (type) {
    case 'logos':
      return imageTypes;
    case 'receipts':
      return {
        extensions: [...imageTypes.extensions, ...documentTypes.extensions],
        mimeTypes: [...imageTypes.mimeTypes, ...documentTypes.mimeTypes]
      };
    case 'products':
      return {
        extensions: [...imageTypes.extensions, ...dataTypes.extensions],
        mimeTypes: [...imageTypes.mimeTypes, ...dataTypes.mimeTypes]
      };
    case 'documents':
      return documentTypes;
    case 'attachments':
      return {
        extensions: [...imageTypes.extensions, ...documentTypes.extensions],
        mimeTypes: [...imageTypes.mimeTypes, ...documentTypes.mimeTypes]
      };
    default:
      return {
        extensions: [...imageTypes.extensions, ...documentTypes.extensions, ...dataTypes.extensions],
        mimeTypes: [...imageTypes.mimeTypes, ...documentTypes.mimeTypes, ...dataTypes.mimeTypes]
      };
  }
}

// Create upload directories if they don't exist
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Initialize upload directories
async function initializeUploadDirectories() {
  const directories = [
    'uploads/logos/',
    'uploads/receipts/',
    'uploads/attachments/',
    'uploads/products/',
    'uploads/documents/',
    'uploads/general/',
    'uploads/temp/'
  ];

  for (const dir of directories) {
    await ensureDirectoryExists(dir);
  }
}

// Initialize directories on module load
initializeUploadDirectories().catch(console.error);

// Upload single file
router.post('/:type', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileUrl = `/uploads/${req.params.type}/${req.file.filename}`;
    
    res.json({
      message: 'File uploaded successfully',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
        type: req.params.type
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// Upload multiple files
router.post('/:type/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const uploadedFiles = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      url: `/uploads/${req.params.type}/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
      type: req.params.type
    }));

    res.json({
      message: `${req.files.length} files uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// Delete file
router.delete('/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    // Security check: ensure filename belongs to the user's company
    if (!filename.startsWith(req.user.companyId + '-')) {
      return res.status(403).json({ error: 'Unauthorized: Cannot delete files from other companies' });
    }

    const filePath = path.join(getUploadPath(type), filename);
    
    try {
      await fs.unlink(filePath);
      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'File not found' });
      }
      throw error;
    }

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'File deletion failed' });
  }
});

// Get file info
router.get('/:type/:filename/info', async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    // Security check: ensure filename belongs to the user's company
    if (!filename.startsWith(req.user.companyId + '-')) {
      return res.status(403).json({ error: 'Unauthorized: Cannot access files from other companies' });
    }

    const filePath = path.join(getUploadPath(type), filename);
    
    try {
      const stats = await fs.stat(filePath);
      
      res.json({
        filename,
        type,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/uploads/${type}/${filename}`
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'File not found' });
      }
      throw error;
    }

  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ error: 'Failed to get file information' });
  }
});

// List files for a company and type
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const uploadPath = getUploadPath(type);
    const companyPrefix = req.user.companyId + '-';
    
    try {
      const files = await fs.readdir(uploadPath);
      
      // Filter files belonging to the user's company
      const companyFiles = files.filter(file => file.startsWith(companyPrefix));
      
      // Get file stats for each file
      const fileInfoPromises = companyFiles.map(async (filename) => {
        try {
          const filePath = path.join(uploadPath, filename);
          const stats = await fs.stat(filePath);
          
          return {
            filename,
            originalName: filename.replace(companyPrefix, '').replace(/^\d+-\d+-/, ''),
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            url: `/uploads/${type}/${filename}`,
            type
          };
        } catch (error) {
          return null; // File might have been deleted
        }
      });
      
      const fileInfos = (await Promise.all(fileInfoPromises))
        .filter(info => info !== null)
        .sort((a, b) => new Date(b.created) - new Date(a.created));
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedFiles = fileInfos.slice(startIndex, endIndex);
      
      res.json({
        files: paginatedFiles,
        totalCount: fileInfos.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(fileInfos.length / limit)
      });
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.json({ files: [], totalCount: 0, currentPage: 1, totalPages: 0 });
      }
      throw error;
    }

  } catch (error) {
    console.error('File listing error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Clean up old files (admin only)
router.delete('/cleanup/old-files', async (req, res) => {
  try {
    if (!['owner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins can perform cleanup operations' });
    }

    const { daysOld = 30 } = req.query;
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const uploadTypes = ['logos', 'receipts', 'attachments', 'products', 'documents', 'general', 'temp'];
    let deletedCount = 0;
    let totalSize = 0;

    for (const type of uploadTypes) {
      const uploadPath = getUploadPath(type);
      const companyPrefix = req.user.companyId + '-';
      
      try {
        const files = await fs.readdir(uploadPath);
        const companyFiles = files.filter(file => file.startsWith(companyPrefix));
        
        for (const filename of companyFiles) {
          const filePath = path.join(uploadPath, filename);
          try {
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              deletedCount++;
              totalSize += stats.size;
            }
          } catch (error) {
            // File might already be deleted, continue
          }
        }
      } catch (error) {
        // Directory might not exist, continue
      }
    }

    res.json({
      message: 'Cleanup completed',
      deletedFiles: deletedCount,
      freedSpace: totalSize,
      cutoffDate
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup operation failed' });
  }
});

// Get storage usage statistics
router.get('/stats/usage', async (req, res) => {
  try {
    const uploadTypes = ['logos', 'receipts', 'attachments', 'products', 'documents', 'general'];
    const companyPrefix = req.user.companyId + '-';
    const usage = {};
    let totalSize = 0;
    let totalFiles = 0;

    for (const type of uploadTypes) {
      const uploadPath = getUploadPath(type);
      usage[type] = { fileCount: 0, totalSize: 0 };
      
      try {
        const files = await fs.readdir(uploadPath);
        const companyFiles = files.filter(file => file.startsWith(companyPrefix));
        
        for (const filename of companyFiles) {
          const filePath = path.join(uploadPath, filename);
          try {
            const stats = await fs.stat(filePath);
            usage[type].fileCount++;
            usage[type].totalSize += stats.size;
          } catch (error) {
            // File might have been deleted, continue
          }
        }
        
        totalFiles += usage[type].fileCount;
        totalSize += usage[type].totalSize;
      } catch (error) {
        // Directory might not exist, continue
      }
    }

    res.json({
      totalFiles,
      totalSize,
      byType: usage,
      formattedSize: formatBytes(totalSize)
    });

  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;

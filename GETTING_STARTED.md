# 🚀 BoliBooks - Getting Started Guide

Welcome to **BoliBooks** - Your Complete Business Management Solution with POS, Invoicing, Inventory, and Barcode Scanning!

## 📋 **Table of Contents**
- [Quick Start](#quick-start)
- [System Requirements](#system-requirements)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Testing](#api-testing)
- [Frontend Setup](#frontend-setup)
- [Common Operations](#common-operations)
- [Troubleshooting](#troubleshooting)

## ⚡ **Quick Start**

### **1. Backend API Server**
```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already done)
npm install

# Start the server
npm start
```

**Server will be running at:** `http://localhost:5000`

### **2. Health Check**
Test if the server is running:
```bash
# Using curl
curl http://localhost:5000/api/health

# Using PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```

Expected response:
```json
{
  "status": "OK",
  "message": "BoliBooks API is running",
  "timestamp": "2025-01-09T13:30:00.000Z"
}
```

## 🖥️ **System Requirements**

- **Node.js**: 16.x or higher
- **npm**: 7.x or higher
- **Database**: SQLite (included)
- **OS**: Windows, macOS, Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB free space

## 🔧 **Installation & Setup**

### **Backend Setup** (✅ Already Complete)
```bash
# Navigate to project
cd C:\Users\User\bolibooks\backend

# Dependencies already installed
npm install  # Already done

# Environment variables (optional)
# Create .env file for custom configuration
```

### **Database**
- **Type**: SQLite (automatically created)
- **Location**: `backend/database.sqlite`
- **Auto-migration**: Yes (tables created automatically)

## 🏃 **Running the Application**

### **1. Start Backend API**
```powershell
# In PowerShell (from backend directory)
cd C:\Users\User\bolibooks\backend
npm start
```

### **2. Development Mode** (with auto-reload)
```powershell
# For development with auto-restart on changes
npm run dev
```

### **3. Production Mode**
```powershell
# Set environment to production
$env:NODE_ENV="production"
npm start
```

### **4. Available Scripts**
```json
{
  "start": "node src/server.js",           # Start production server
  "dev": "nodemon src/server.js",          # Start development server
  "test": "jest",                          # Run tests
  "lint": "eslint src/",                   # Code linting
  "db:migrate": "node src/database/migrate.js"  # Database migrations
}
```

## 🧪 **API Testing**

### **Using PowerShell (Windows)**

#### **1. Register a New Company & User**
```powershell
$registerData = @{
    email = "owner@testcompany.com"
    password = "password123"
    firstName = "John"
    lastName = "Doe"
    companyName = "Test Company Ltd"
    companyAddress = "123 Business St, City, State"
    companyPhone = "+1-555-0123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
```

#### **2. Login and Get Token**
```powershell
$loginData = @{
    email = "owner@testcompany.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$token = $response.token
echo "Token: $token"
```

#### **3. Create a Product**
```powershell
$productData = @{
    name = "Sample Product"
    description = "A test product"
    price = 29.99
    cost = 15.00
    stockQuantity = 100
    lowStockThreshold = 10
    category = "Electronics"
    unit = "pcs"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/products" -Method POST -Body $productData -Headers $headers
```

#### **4. Generate Barcode for Product**
```powershell
# Get the product ID from the previous response, then:
$barcodeData = @{
    type = "EAN-13"
    companyPrefix = "123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/products/[PRODUCT_ID]/generate-barcode" -Method POST -Body $barcodeData -Headers $headers
```

#### **5. Scan Barcode in POS**
```powershell
# Use the generated barcode
Invoke-RestMethod -Uri "http://localhost:5000/api/pos/scan/[BARCODE]" -Headers $headers
```

### **Using curl (Cross-platform)**

#### **1. Register Company**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@testcompany.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "companyName": "Test Company Ltd"
  }'
```

#### **2. Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@testcompany.com",
    "password": "password123"
  }'
```

#### **3. Test POS Scan**
```bash
# Replace [TOKEN] and [BARCODE] with actual values
curl -H "Authorization: Bearer [TOKEN]" \
  http://localhost:5000/api/pos/scan/[BARCODE]
```

## 🖥️ **Frontend Setup** (Optional - For Full Web Interface)

Currently, we have a robust backend API. To create a web interface:

### **Option 1: Simple Test Interface**
Create a simple HTML file to test the API:

```html
<!DOCTYPE html>
<html>
<head>
    <title>BoliBooks Test Interface</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
        button { padding: 10px 20px; margin: 5px; }
        input, textarea { width: 300px; padding: 5px; margin: 5px; }
    </style>
</head>
<body>
    <h1>BoliBooks API Tester</h1>
    
    <div class="section">
        <h2>Authentication</h2>
        <input type="email" id="email" placeholder="Email" value="owner@testcompany.com">
        <input type="password" id="password" placeholder="Password" value="password123">
        <button onclick="login()">Login</button>
        <div id="token-display"></div>
    </div>
    
    <div class="section">
        <h2>Barcode Scanner</h2>
        <input type="text" id="barcode" placeholder="Enter or scan barcode">
        <button onclick="scanBarcode()">Scan Product</button>
        <div id="scan-result"></div>
    </div>
    
    <script>
        let authToken = '';
        
        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                if (data.token) {
                    authToken = data.token;
                    document.getElementById('token-display').innerHTML = 
                        `<p>✅ Logged in as: ${data.user.firstName} ${data.user.lastName}</p>`;
                } else {
                    alert('Login failed: ' + data.error);
                }
            } catch (error) {
                alert('Login error: ' + error.message);
            }
        }
        
        async function scanBarcode() {
            const barcode = document.getElementById('barcode').value;
            if (!barcode || !authToken) {
                alert('Please login and enter a barcode');
                return;
            }
            
            try {
                const response = await fetch(`http://localhost:5000/api/pos/scan/${barcode}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                const data = await response.json();
                document.getElementById('scan-result').innerHTML = 
                    `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            } catch (error) {
                alert('Scan error: ' + error.message);
            }
        }
    </script>
</body>
</html>
```

### **Option 2: React Frontend**
```bash
# In a new terminal, from the project root
npx create-react-app frontend
cd frontend
npm install axios  # For API calls
npm start  # Starts on http://localhost:3000
```

## 🔧 **Common Operations**

### **1. Complete POS Transaction Workflow**

#### **Step 1: Scan Items**
```powershell
# Scan each product barcode
Invoke-RestMethod -Uri "http://localhost:5000/api/pos/scan/1234567890123" -Headers $headers
```

#### **Step 2: Create POS Sale**
```powershell
$saleData = @{
    items = @(
        @{
            productId = "product-uuid"
            quantity = 2
            discountType = "percentage"
            discountValue = 10
        }
    )
    paymentMethod = "cash"
    amountTendered = 50.00
    customerInfo = @{
        name = "Walk-in Customer"
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:5000/api/pos/sales" -Method POST -Body $saleData -Headers $headers
```

#### **Step 3: Generate Receipt**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/pos/sales/[SALE_ID]/receipt" -Headers $headers
```

### **2. Inventory Management**

#### **Bulk Generate Barcodes**
```powershell
$barcodeData = @{
    type = "EAN-13"
    companyPrefix = "123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/products/bulk-generate-barcodes" -Method POST -Body $barcodeData -Headers $headers
```

#### **Check Low Stock**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/products/low-stock" -Headers $headers
```

### **3. Business Reports**

#### **Daily Sales Report**
```powershell
$today = Get-Date -Format "yyyy-MM-dd"
Invoke-RestMethod -Uri "http://localhost:5000/api/pos/reports/daily?date=$today" -Headers $headers
```

## 🛠️ **Troubleshooting**

### **Common Issues & Solutions**

#### **1. Server Won't Start**
```bash
# Check if port 5000 is in use
netstat -an | findstr :5000

# Kill process using port 5000
# Find the PID and use: taskkill /PID [PID] /F

# Or use a different port
$env:PORT=3001
npm start
```

#### **2. Database Issues**
```bash
# Reset database (⚠️ This will delete all data)
rm database.sqlite
npm start  # Will recreate tables
```

#### **3. Authentication Errors**
- Make sure to include `Authorization: Bearer [TOKEN]` header
- Tokens expire after 24 hours by default
- Use the `/api/auth/refresh` endpoint to get a new token

#### **4. Barcode Scanning Issues**
```powershell
# Validate barcode format
$barcodeData = @{ barcode = "1234567890123" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/products/validate-barcode" -Method POST -Body $barcodeData -Headers @{"Content-Type"="application/json"}
```

### **Environment Variables**
Create a `.env` file in the backend directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=./database.sqlite

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# CORS
CLIENT_URL=http://localhost:3000

# File Uploads
MAX_FILE_SIZE=10485760  # 10MB

# Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100  # Max requests per window
```

## 🔗 **API Documentation**

### **Base URL**
```
http://localhost:5000/api
```

### **Authentication**
All protected endpoints require:
```
Authorization: Bearer [JWT_TOKEN]
```

### **Key Endpoints**
- **Health Check**: `GET /health`
- **Authentication**: `POST /auth/login`, `POST /auth/register`
- **Products**: `GET /products`, `POST /products`, `GET /products/barcode/:barcode`
- **POS**: `GET /pos/scan/:barcode`, `POST /pos/sales`, `GET /pos/reports/daily`
- **Inventory**: `GET /products/low-stock`, `POST /products/bulk-generate-barcodes`
- **Templates**: `GET /templates`, `POST /templates`, `GET /templates/:id/preview`

## 🎯 **Next Steps**

1. **Test the API** using the examples above
2. **Create sample products** with barcodes
3. **Try POS transactions** with barcode scanning
4. **Generate business reports** to see analytics
5. **Build a frontend** using React, Vue, or plain HTML/JS
6. **Deploy to production** when ready

## 📞 **Support**

For questions or issues:
1. Check the **API health** endpoint first
2. Review **console logs** for error messages
3. Verify **authentication tokens** are valid
4. Test **individual endpoints** before complex workflows

---

**🎉 Congratulations! Your BoliBooks application is now ready to revolutionize your business operations!**

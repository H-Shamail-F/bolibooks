# BoliBooks - Complete Business Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.2.0-blue)](https://reactjs.org/)

BoliBooks is a comprehensive invoicing and business management application designed for small to medium-sized businesses. It provides a complete solution for managing quotes, invoices, inventory, customers, expenses, and financial reporting including Profit & Loss statements.

## 🚀 Features

### 📋 Quotes & Invoices
- Create, send, and track invoices with multiple statuses (Draft, Sent, Paid, Overdue)
- Convert quotes to invoices seamlessly
- **Multiple customizable templates** (Modern, Classic, Minimal, Professional)
- PDF generation and email sharing
- WhatsApp share integration (configurable)
- GST/Tax calculation support (8%/16% configurable)
- **Dhivehi/English language template support**

### 📦 Inventory Management
- Add and manage products with SKU, price, and stock tracking
- **Bulk product upload** via Excel/CSV with validation
- Automatic stock deduction when invoiced
- Low-stock alerts and notifications
- Product categories and search functionality
- Portal visibility settings for customer-facing products

### 👥 Customer Management
- Comprehensive customer database with contact information
- Customer transaction history and payment tracking
- Credit limits and payment terms management

### 💳 Payment Tracking
- Record payments against invoices (cash, bank transfer, card)
- Partial payment support
- Outstanding balance tracking per customer
- Payment method analytics

### 💰 Expense Management
- Record business expenses by category (Rent, Utilities, Salaries, etc.)
- Receipt upload and attachment support
- Vendor management and recurring expenses
- Expense approval workflow

### 🌐 Customer Portal (Semi-Auto Flow)
- **Public customer portal** for each company with custom domain support
- Customers can browse product/service catalog
- **Self-service quote generation** - customers select items and quantities
- Automatic draft quote creation for company review and approval
- Quote tracking with unique tracking codes
- Customer quote acceptance/rejection workflow
- **Multi-tenant architecture** with company isolation

### 📊 Reports & Dashboard
- **Profit & Loss Report**: Monthly/custom date range revenue vs expenses
- **Sales Report**: Total sales per month/customer with analytics
- **Inventory Report**: Stock levels and sales per product
- **Receivables Report**: Outstanding invoices by customer
- Interactive dashboard with key metrics and charts

### ⚙️ Settings & Configuration
- Company profile management (logo, tax ID, currency)
- **Subscription management** (Trial, Active, Suspended)
- **Custom invoice templates** with drag-and-drop editor
- GST toggle and rate configuration (8%/16%)
- Fiscal year settings for accurate P&L reporting
- Multi-currency support (MVR/USD/EUR/GBP/INR)
- **Customer portal configuration** and branding

## 🏗️ Architecture

BoliBooks is built as a modern full-stack application:

- **Frontend**: React 18 with Tailwind CSS and React Query
- **Backend**: Node.js with Express and comprehensive REST API
- **Database**: SQLite with Sequelize ORM (easily configurable for PostgreSQL/MySQL)
- **Authentication**: JWT-based with role-based access control
- **Multi-tenancy**: Company isolation with subscription management
- **Template Engine**: HTML/CSS templates with placeholder system
- **PDF Generation**: Puppeteer for dynamic invoice/report generation
- **File Storage**: Local file system with multer (S3 compatible)
- **Charts**: Recharts for data visualization
- **Customer Portal**: Public-facing React components for customer self-service

## 📋 Prerequisites

- Node.js (>= 16.0.0)
- npm or yarn
- Git

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bolibooks
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install all project dependencies
   npm run install:all
   ```

3. **Environment Setup**
   ```bash
   # Backend environment
   cp backend/.env.example backend/.env
   
   # Frontend environment
   cp frontend/.env.example frontend/.env
   ```

4. **Configure Environment Variables**
   
   **Backend (.env)**:
   - `JWT_SECRET`: Your JWT secret key
   - `DATABASE_URL`: SQLite database path
   - `SMTP_*`: Email configuration for invoice sending
   
   **Frontend (.env)**:
   - `REACT_APP_API_URL`: Backend API URL

5. **Database Setup**
   ```bash
   # Database will be automatically created on first run
   # No manual setup required for SQLite
   ```

## 🚀 Running the Application

### Development Mode
```bash
# Start both frontend and backend concurrently
npm run dev

# Or start individually
npm run backend:dev    # Backend on http://localhost:5000
npm run frontend:dev   # Frontend on http://localhost:3000
```

### Production Mode
```bash
# Build frontend
npm run build

# Start backend
npm run backend:start
```

## 📊 Profit & Loss (P&L) Logic

The P&L calculation follows standard accounting principles:

### Revenue Calculation
- Sum of all **paid** invoices within the selected date range
- Can be calculated by payment date OR issue date (configurable)
- Excludes draft, cancelled, and unpaid invoices

### Expense Calculation  
- Sum of all approved expenses within the date range
- Categorized by expense type (Rent, Utilities, Salaries, etc.)
- Includes receipt attachments and vendor tracking

### Formula
```
Profit/Loss = Total Revenue - Total Expenses
```

### Example (June 2025)
- **Revenue**: MVR 150,000 (from paid invoices)
- **Expenses**: MVR 100,000 (Rent: 25k + Utilities: 5k + Salaries: 50k + Supplies: 20k)
- **Net Profit**: MVR 50,000

## 🗃️ Database Schema

### Core Tables
- **companies**: Business information, settings, and subscription status
- **users**: User accounts with role-based authentication
- **customers**: Customer information and contact details
- **products**: Inventory items with pricing, stock, and portal visibility
- **templates**: Customizable invoice/quote templates with HTML/CSS
- **invoices**: Quotes and invoices with status tracking and template references
- **invoice_items**: Line items for each invoice with product references
- **payments**: Payment records against invoices with multiple methods
- **expenses**: Business expense records with categories and receipt uploads

### Key Relationships
- Company → Users, Customers, Products, Invoices, Expenses
- Invoice → Customer, InvoiceItems, Payments
- Product → InvoiceItems (for stock tracking)

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Invoices
- `GET /api/invoices` - List invoices with filtering
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/convert-to-invoice` - Convert quote to invoice

### Reports
- `GET /api/reports/profit-loss` - P&L report
- `GET /api/reports/sales` - Sales analytics
- `GET /api/reports/inventory` - Stock levels
- `GET /api/reports/receivables` - Outstanding invoices

### Customer Portal (Public)
- `GET /api/portal/company/:identifier` - Get company portal info
- `GET /api/portal/company/:companyId/products` - Get portal product catalog
- `POST /api/portal/company/:companyId/quote-request` - Submit quote request
- `GET /api/portal/quote/:trackingCode` - Get quote status
- `PATCH /api/portal/quote/:trackingCode/response` - Accept/reject quote

### Templates
- `GET /api/templates` - List company templates
- `POST /api/templates` - Create custom template
- `PUT /api/templates/:id` - Update template
- `GET /api/templates/:id/preview` - Generate template preview

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests  
cd frontend && npm test

# Run all tests
npm test
```

## 📦 Deployment

### Using Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
1. Build the frontend: `npm run build`
2. Set environment variables for production
3. Start the backend server: `npm run backend:start`
4. Serve frontend build files with nginx/apache

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please contact:
- Email: support@bolibooks.com
- Documentation: [docs.bolibooks.com](https://docs.bolibooks.com)
- Issues: [GitHub Issues](https://github.com/bolibooks/bolibooks/issues)

## 🎯 Roadmap

### Phase 1 (MVP) - ✅ Current
- [x] Core invoicing system
- [x] Inventory management
- [x] Customer management
- [x] Expense tracking
- [x] Basic P&L reporting

### Phase 2 (Enhanced Reporting)
- [ ] Advanced analytics dashboard
- [ ] Recurring invoices
- [ ] Multi-user support
- [ ] Advanced expense categorization
- [ ] Integration with payment gateways

### Phase 3 (Advanced Features)
- [ ] Multi-company support
- [ ] Advanced reporting (Cash Flow, Balance Sheet)
- [ ] API integrations (WhatsApp, SMS)
- [ ] Mobile application
- [ ] Advanced inventory features (Purchase Orders, Suppliers)

---

**Made with ❤️ for small businesses worldwide**

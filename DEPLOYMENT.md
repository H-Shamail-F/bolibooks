# BoliBooks Deployment & Operations Guide

This document explains how to set up, run, test, and operate BoliBooks in development and production. It also covers migrating to a new server and updating external credentials (PayPal & BML).

Audience: DevOps, developers, and operators.


## 1) Prerequisites

- Node.js LTS (>= 18)
- npm (>= 9)
- Git
- SQLite (bundled via Sequelize; no separate install needed)
- For production: reverse proxy (Nginx/Apache) and process manager (PM2/systemd)


## 2) Repository Layout (relevant parts)

- backend/
  - src/
    - server.js (Express app)
    - database/
      - index.js (Sequelize init + associations)
      - seed-subscription-plans.js (seeding plans)
    - routes/ (REST API routes)
    - models/ (Sequelize models)
  - __tests__/ (Jest tests)
  - test-subscription-system.js (interactive end-to-end test)
- frontend/ (React app)


## 3) Environment Variables

Create backend/.env (don't commit secrets). Example:

- PORT=5000
- CLIENT_URL=http://localhost:3000
- JWT_SECRET=change_me
- JWT_EXPIRES_IN=24h
- DATABASE_URL=./database.sqlite
- FORCE_DB_SYNC=false
- NODE_ENV=development

Payment integrations:
- PAYPAL_CLIENT_ID={{PAYPAL_CLIENT_ID}}
- PAYPAL_CLIENT_SECRET={{PAYPAL_CLIENT_SECRET}}
- PAYPAL_MODE=sandbox # or live

BML (Bank of Maldives) integration:
- BML_API_KEY={{BML_API_KEY}}
- BML_API_SECRET={{BML_API_SECRET}}
- BML_API_BASE_URL=https://api.bankofmaldives.com # example; confirm actual URL

Note on secrets: Store them securely (e.g., environment, secret managers). Do not echo secrets on the terminal.


## 4) Install Dependencies

Backend:
1) cd backend
2) npm install

Frontend:
1) cd frontend
2) npm install


## 5) Initialize Database and Seed Subscription Plans

The backend uses SQLite by default. For development:

### Quick Setup (Recommended for Demo)
- From backend: node init-demo-user.js

This will:
- Initialize the database with all tables
- Seed subscription plans (Starter, Growth, Business, Enterprise)
- Clear any existing test data
- Create a demo user with known credentials:
  - Email: demo@bolibooks.com
  - Password: demo123
  - Company: Demo Company
  - Role: Owner

### Alternative Options
Option A: Run tests to also validate seeding works
- From backend: npm test

Option B: Programmatic seeding in a Node REPL/script
- From backend: node -e "require('./src/database/seed-subscription-plans').seedSubscriptionPlans()"

Note: During normal server startup, the database is initialized with associations and synced. For dev, set FORCE_DB_SYNC=true to recreate tables if needed. Do not use FORCE_DB_SYNC in production unless performing a controlled rebuild.


## 6) Running the Apps

Development:
- Backend: from backend/ run: npm start (or node src/server.js)
- Frontend: from frontend/ run: npm start, then visit http://localhost:3000

Ensure CLIENT_URL in backend .env matches the frontend URL and CORS settings.

Production (example with PM2):
- Build frontend: cd frontend && npm run build
- Serve frontend build via your web server or a static host
- Start backend with PM2:
  - cd backend
  - pm2 start src/server.js --name bolibooks-api
  - pm2 save
  - pm2 startup (to configure boot autostart)

Behind Nginx, proxy requests to the backend on PORT (default 5000) and serve frontend build from /var/www/bolibooks (or similar).


## 7) Running Automated Tests

- From backend/: npm test

This will:
- Initialize and sync the database
- Seed subscription plans
- Run API tests for health, auth, subscriptions, and usage stats


## 8) Running the Interactive Subscription Test Script

The script requires interactive input (email/password). From backend/:
- node test-subscription-system.js

Follow the prompts to:
- Login (or register first through API if needed)
- Subscribe/change plan
- Manage add-ons
- View usage stats, billing history, dashboard

Tip: Use Postman/Thunder Client to register a user first via POST /api/auth/register, then login in the script.


## 9) Updating PayPal Credentials

Where: backend/.env
- PAYPAL_CLIENT_ID={{PAYPAL_CLIENT_ID}}
- PAYPAL_CLIENT_SECRET={{PAYPAL_CLIENT_SECRET}}
- PAYPAL_MODE=sandbox|live

Procedure:
1) Obtain client ID/secret from PayPal Developer Dashboard
2) Update backend/.env
3) Restart backend process:
   - PM2: pm2 restart bolibooks-api
   - Or if using systemd: systemctl restart bolibooks-api

Never print secrets to the terminal. Do not commit .env files.


## 10) Updating BML Credentials

Where: backend/.env
- BML_API_KEY={{BML_API_KEY}}
- BML_API_SECRET={{BML_API_SECRET}}
- BML_API_BASE_URL=... (confirm endpoint)

Procedure mirrors PayPal:
1) Obtain keys/secrets from BML
2) Update backend/.env
3) Restart backend service


## 11) Migrating to a New Server

High-level steps:
1) Provision server (Node.js LTS, npm, reverse proxy, PM2/systemd)
2) Clone repository
   - git clone <repo-url>
3) Set environment
   - Copy .env files (securely) to backend/.env (and any frontend envs if applicable)
4) Install dependencies
   - backend: npm install
   - frontend: npm install
5) Initialize DB and seed plans
   - backend: npm test (to verify and seed) or run seeding script
6) Build and start services
   - frontend: npm run build
   - backend: pm2 start src/server.js --name bolibooks-api
7) Configure reverse proxy for HTTPS
   - Point domain to server, set TLS, proxy /api to backend PORT, serve frontend build
8) Smoke test
   - Hit /api/health, check 200 OK and database: connected
   - Register user, login, list plans, subscribe, etc.

Data migration (if moving data):
- If using SQLite, securely copy database.sqlite from old to new server (same path as DATABASE_URL)
- Ensure file permissions and backups

Backups:
- Schedule periodic backups of the SQLite DB file
- Store offsite


## 12) Production Considerations

- Logging: Ensure logs are captured (PM2 logs or centralized logging)
- Monitoring: Uptime checks on /api/health
- Security:
  - Strong JWT_SECRET
  - Disable FORCE_DB_SYNC in production
  - Rate limiting enabled by default
  - HTTPS via reverse proxy
- Scaling: For higher concurrency, consider moving from SQLite to Postgres/MySQL. Update Sequelize config accordingly.


## 13) Common Operations

- Restart backend: pm2 restart bolibooks-api
- View backend logs: pm2 logs bolibooks-api
- Update code:
  - git pull
  - npm install (if needed)
  - pm2 restart bolibooks-api
- Run tests (staging/dev): npm test


## 14) API Quick Reference (selected)

- Auth
  - POST /api/auth/register { email, password, firstName, lastName, companyName, companyAddress?, companyPhone? }
  - POST /api/auth/login { email, password }
  - GET /api/auth/me (Bearer token)
- Subscriptions
  - GET /api/subscriptions/plans (public)
  - GET /api/subscriptions/current (Bearer token)
- Companies
  - GET /api/companies/usage-stats (Bearer token)


## 15) Troubleshooting

- Company is not associated to User!
  - Ensure tests or server call initializeDatabase() before using models
- 400 on /api/auth/register
  - Verify request body matches route: firstName, lastName, companyName required
- CORS issues
  - Ensure CLIENT_URL matches the frontend origin
- Database schema mismatch
  - In dev, set FORCE_DB_SYNC=true temporarily, then restart backend


---
For questions or escalations, contact the development team or system owner.

# BoliBooks Deployment Guide

This guide covers how to deploy BoliBooks to a production server, configure custom domains, and manage installations.

## 🚀 Quick Start (Current System)

### Starting the Application

1. **Start Backend Server:**
   ```bash
   cd backend
   node src/server.js
   # Server runs on http://localhost:5000
   ```

2. **Start Frontend (in new terminal):**
   ```bash
   cd frontend
   npm start
   # Frontend runs on http://localhost:3000
   ```

3. **Access the Application:**
   - Open browser to `http://localhost:3000`
   - Login with: `admin@bolivooks.com` / `admin123`

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18+ 
- **npm**: Version 8+
- **Operating System**: Windows, Linux, or macOS
- **Memory**: Minimum 2GB RAM
- **Storage**: Minimum 1GB free space

### Production Server Requirements
- **Web Server**: Nginx or Apache (recommended)
- **Process Manager**: PM2 (recommended)
- **SSL Certificate**: Let's Encrypt or commercial
- **Database**: SQLite (included) or PostgreSQL/MySQL for scale

## 🏗️ Production Deployment

### Method 1: Direct Server Deployment

#### Step 1: Prepare the Server
```bash
# Update system (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

#### Step 2: Deploy Application
```bash
# Clone or copy your BoliBooks folder to server
scp -r bolibooks/ user@your-server:/var/www/

# Or if using git
git clone <your-repo> /var/www/bolibooks
cd /var/www/bolibooks

# Install dependencies
cd backend && npm install --production
cd ../frontend && npm install --production

# Build frontend for production
npm run build
```

#### Step 3: Configure Environment
```bash
cd /var/www/bolibooks
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit configuration (see Environment Configuration section)
nano backend/.env
nano frontend/.env
```

#### Step 4: Configure Process Management
```bash
# Create PM2 ecosystem file (see pm2.ecosystem.js below)
pm2 start pm2.ecosystem.js
pm2 save
pm2 startup
```

#### Step 5: Configure Web Server (Nginx)
```bash
# Create Nginx configuration (see nginx.conf below)
sudo nano /etc/nginx/sites-available/bolibooks
sudo ln -s /etc/nginx/sites-available/bolibooks /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Method 2: Docker Deployment (Recommended)

#### Step 1: Build Docker Images
```bash
# Build and run with Docker Compose
docker-compose up -d --build
```

#### Step 2: Configure Domain
```bash
# Update docker-compose.yml with your domain
# Set environment variables for production URLs
```

## ⚙️ Environment Configuration

### Backend Configuration (`backend/.env`)
```env
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=/var/www/bolibooks/database.sqlite

# CORS Configuration
CLIENT_URL=https://yourdomain.com

# Security
JWT_SECRET=your-super-secure-jwt-secret-here-change-this
JWT_EXPIRES_IN=7d

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Payment Configuration (Optional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=live

# Company Settings
DEFAULT_COMPANY_NAME=Your Company Name
DEFAULT_CURRENCY=USD
DEFAULT_TAX_RATE=10
```

### Frontend Configuration (`frontend/.env`)
```env
# API Configuration
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_BASE_URL=https://yourdomain.com

# Branding
REACT_APP_COMPANY_NAME=Your Company Name
REACT_APP_LOGO_URL=/logo.png

# Features
REACT_APP_ENABLE_PAYMENTS=true
REACT_APP_ENABLE_MULTI_CURRENCY=true
REACT_APP_DEFAULT_CURRENCY=USD

# Payment Keys (Public keys only)
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_...
REACT_APP_PAYPAL_CLIENT_ID=your-paypal-client-id

# Analytics (Optional)
REACT_APP_GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
```

## 🌐 Domain and URL Configuration

### Changing Site URL

#### 1. Update Backend Configuration
```bash
# Edit backend/.env
CLIENT_URL=https://yournewdomain.com
```

#### 2. Update Frontend Configuration
```bash
# Edit frontend/.env
REACT_APP_API_URL=https://api.yournewdomain.com
REACT_APP_BASE_URL=https://yournewdomain.com
```

#### 3. Update Nginx Configuration
```nginx
server {
    listen 80;
    server_name yournewdomain.com www.yournewdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yournewdomain.com www.yournewdomain.com;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yournewdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yournewdomain.com/privkey.pem;
    
    # Frontend (React build)
    location / {
        root /var/www/bolibooks/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. Obtain SSL Certificate
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yournewdomain.com -d www.yournewdomain.com
```

#### 5. Restart Services
```bash
pm2 restart all
sudo systemctl reload nginx
```

### Custom Subdomain Setup

For API on subdomain (e.g., `api.yourdomain.com`):

```nginx
# API subdomain
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        # ... proxy settings
    }
}
```

## 📦 Database Migration

### Moving to New Server

#### 1. Backup Database
```bash
# On old server
cp database.sqlite database-backup-$(date +%Y%m%d).sqlite
```

#### 2. Transfer Database
```bash
# Copy to new server
scp database.sqlite user@new-server:/var/www/bolibooks/
```

#### 3. Update Database Path
```bash
# Update backend/.env on new server
DATABASE_URL=/var/www/bolibooks/database.sqlite
```

### Scaling to PostgreSQL/MySQL

Update `backend/.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/bolibooks
# OR
DATABASE_URL=mysql://username:password@localhost:3306/bolibooks
```

## 🔄 Backup Strategy

### Automated Backup Script
```bash
#!/bin/bash
# Create backup script: /usr/local/bin/bolibooks-backup.sh

BACKUP_DIR="/var/backups/bolibooks"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp /var/www/bolibooks/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/bolibooks/backend/uploads

# Keep only last 30 days
find $BACKUP_DIR -name "*.sqlite" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
# Run daily at 2 AM
0 2 * * * /usr/local/bin/bolibooks-backup.sh
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
sudo lsof -i :5000
sudo kill -9 <PID>
```

#### 2. Permission Denied
```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/bolibooks
sudo chmod -R 755 /var/www/bolibooks
```

#### 3. Database Connection Error
```bash
# Check database file exists and permissions
ls -la database.sqlite
sudo chown www-data:www-data database.sqlite
```

#### 4. Frontend Build Fails
```bash
# Clear npm cache and reinstall
cd frontend
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📊 Monitoring

### Health Checks
- Backend: `GET /api/health`
- Database: Check file modification time
- Frontend: Check if build files exist

### Log Monitoring
```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🆙 Updates

### Updating BoliBooks
```bash
# Backup current version
cp -r /var/www/bolibooks /var/www/bolibooks-backup-$(date +%Y%m%d)

# Pull/copy new version
cd /var/www/bolibooks
git pull origin main

# Update dependencies
cd backend && npm install --production
cd ../frontend && npm install --production && npm run build

# Restart services
pm2 restart all
```

This completes the deployment guide. Next, I'll create the supporting configuration files!

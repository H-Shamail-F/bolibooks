#!/usr/bin/env bash
# BoliBooks.com Production Installer for Ubuntu/Debian
# 
# Quick Install Command:
#   curl -fsSL https://raw.githubusercontent.com/your-org/bolibooks/main/install-bolibooks.sh | sudo bash -s -- -e admin@yourdomain.com
#
# Or download and run:
#   wget https://raw.githubusercontent.com/your-org/bolibooks/main/install-bolibooks.sh
#   sudo bash install-bolibooks.sh -e admin@yourdomain.com [-n to skip SSL]
#
# This installer is pre-configured for BoliBooks.com domain

set -euo pipefail

# Pre-configured for BoliBooks.com
PRIMARY_DOMAIN="BoliBooks.com"
ADMIN_EMAIL=""
PROJECT_PATH="/var/www/bolibooks"
REPO="https://github.com/your-org/bolibooks.git"
BRANCH="main"
NO_SSL=0

while getopts ":e:p:r:b:n" opt; do
  case $opt in
    e) ADMIN_EMAIL="$OPTARG" ;;
    p) PROJECT_PATH="$OPTARG" ;;
    r) REPO="$OPTARG" ;;
    b) BRANCH="$OPTARG" ;;
    n) NO_SSL=1 ;;
    \?) echo "Invalid option -$OPTARG" >&2; exit 1 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; exit 1 ;;
  esac
done

if [[ -z "$ADMIN_EMAIL" ]]; then
  echo "Error: -e ADMIN_EMAIL is required for SSL certificate registration" >&2
  echo "Usage: sudo bash install-bolibooks.sh -e admin@yourdomain.com"
  exit 1
fi

echo "=========================================="
echo "🚀 BoliBooks.com Production Installer"
echo "=========================================="
echo "Domain: $PRIMARY_DOMAIN"
echo "Email: $ADMIN_EMAIL"
echo "Path: $PROJECT_PATH"
echo "SSL: $([ $NO_SSL -eq 0 ] && echo 'Enabled' || echo 'Disabled')"
echo "=========================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)" >&2
   exit 1
fi

echo "==> Installing prerequisites..."
apt-get update -y
apt-get install -y curl git unzip

# Node.js 18.x
if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 18.x"
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
else
  echo "✓ Node.js already installed ($(node --version))"
fi

# PM2
if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing PM2"
  npm install -g pm2
else
  echo "✓ PM2 already installed"
fi

# Nginx
if ! command -v nginx >/dev/null 2>&1; then
  echo "==> Installing Nginx"
  apt-get install -y nginx
else
  echo "✓ Nginx already installed"
fi

# Certbot (for SSL)
if [[ $NO_SSL -eq 0 ]]; then
  if ! command -v certbot >/dev/null 2>&1; then
    echo "==> Installing Certbot"
    apt-get install -y certbot python3-certbot-nginx
  else
    echo "✓ Certbot already installed"
  fi
fi

# Project setup
echo "==> Setting up BoliBooks project"
mkdir -p "$PROJECT_PATH"
cd "$PROJECT_PATH"

if [[ -n "$REPO" ]]; then
  echo "==> Cloning BoliBooks repository"
  if [[ -d .git ]]; then
    git fetch --all
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
  else
    git clone -b "$BRANCH" "$REPO" .
  fi
else
  echo "==> Using existing project directory"
fi

# Environment configuration
echo "==> Configuring environment for BoliBooks.com"

# Backend environment
if [[ -f backend/.env.production ]]; then
  cp backend/.env.production backend/.env
elif [[ ! -f backend/.env ]]; then
  cat > backend/.env <<EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
CLIENT_URL=https://BoliBooks.com
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_URL=$PROJECT_PATH/database.sqlite
DEFAULT_COMPANY_NAME=BoliBooks
DEFAULT_CURRENCY=USD
DEFAULT_TAX_RATE=10
SMTP_FROM_EMAIL=noreply@BoliBooks.com
EOF
fi

# Update backend .env with BoliBooks.com configuration
sed -i "s|^CLIENT_URL=.*|CLIENT_URL=https://$PRIMARY_DOMAIN|" backend/.env
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$PROJECT_PATH/database.sqlite|" backend/.env
sed -i "s|^SMTP_FROM_EMAIL=.*|SMTP_FROM_EMAIL=noreply@$PRIMARY_DOMAIN|" backend/.env

# Generate secure JWT secret if placeholder exists
if grep -q "your-super-secure-jwt-secret\|BoliBooks-Production-JWT-Secret" backend/.env; then
  JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" backend/.env
fi

# Frontend environment
if [[ -f frontend/.env.production ]]; then
  cp frontend/.env.production frontend/.env
elif [[ ! -f frontend/.env ]]; then
  cat > frontend/.env <<EOF
REACT_APP_API_URL=https://BoliBooks.com/api
REACT_APP_BASE_URL=https://BoliBooks.com
REACT_APP_NAME=BoliBooks
REACT_APP_TITLE=BoliBooks - Complete Business Management Solution
REACT_APP_DEFAULT_CURRENCY=USD
EOF
fi

# Update frontend .env for BoliBooks.com
sed -i "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=https://$PRIMARY_DOMAIN/api|" frontend/.env
sed -i "s|^REACT_APP_BASE_URL=.*|REACT_APP_BASE_URL=https://$PRIMARY_DOMAIN|" frontend/.env

# Install dependencies and build
echo "==> Installing backend dependencies"
(cd backend && npm install --production)

echo "==> Installing frontend dependencies and building"
(cd frontend && npm install --production && npm run build)

# Create uploads and logs directories
mkdir -p backend/uploads backend/logs
chmod 755 backend/uploads backend/logs

# PM2 configuration
echo "==> Configuring PM2 for BoliBooks"
cat > pm2.ecosystem.js <<EOF
module.exports = {
  apps: [
    {
      name: 'bolibooks-backend',
      script: './backend/src/server.js',
      cwd: '$PROJECT_PATH',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      log_file: '/var/log/pm2/bolibooks.log',
      out_file: '/var/log/pm2/bolibooks-out.log',
      error_file: '/var/log/pm2/bolibooks-error.log',
      max_memory_restart: '512M'
    }
  ]
}
EOF

# Create PM2 log directory
mkdir -p /var/log/pm2

# Start PM2 application
pm2 start pm2.ecosystem.js || pm2 reload pm2.ecosystem.js
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# Nginx configuration
echo "==> Configuring Nginx for BoliBooks.com"
NGINX_SITE="/etc/nginx/sites-available/bolibooks"
cat > "$NGINX_SITE" <<EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $PRIMARY_DOMAIN www.$PRIMARY_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name $PRIMARY_DOMAIN www.$PRIMARY_DOMAIN;
    
    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/$PRIMARY_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$PRIMARY_DOMAIN/privkey.pem;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Frontend (React build)
    root $PROJECT_PATH/frontend/build;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API Routes (Backend)
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # File uploads
    location /uploads/ {
        alias $PROJECT_PATH/backend/uploads/;
        expires 30d;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security
    location ~ /\. {
        deny all;
    }
    
    client_max_body_size 50M;
    
    access_log /var/log/nginx/bolibooks_access.log;
    error_log /var/log/nginx/bolibooks_error.log;
}
EOF

# Enable site
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/bolibooks
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

# SSL Certificate
if [[ $NO_SSL -eq 0 ]]; then
  echo "==> Obtaining SSL certificate for BoliBooks.com"
  certbot --nginx --non-interactive --agree-tos --email "$ADMIN_EMAIL" -d "$PRIMARY_DOMAIN" -d "www.$PRIMARY_DOMAIN" || {
    echo "⚠️ SSL certificate setup failed. You can run this manually later:"
    echo "certbot --nginx -d $PRIMARY_DOMAIN -d www.$PRIMARY_DOMAIN"
  }
fi

# Set proper permissions
chown -R www-data:www-data "$PROJECT_PATH"
chmod -R 755 "$PROJECT_PATH"

echo "=========================================="
echo "🎉 BoliBooks Installation Complete!"
echo "=========================================="
echo "Website: https://$PRIMARY_DOMAIN"
echo "API Health: https://$PRIMARY_DOMAIN/api/health"
echo ""
echo "Default Login Credentials:"
echo "Email: admin@bolivooks.com"
echo "Password: admin123"
echo ""
echo "Management Commands:"
echo "• PM2 Status: pm2 ls"
echo "• View Logs: pm2 logs"
echo "• Restart: pm2 restart all"
echo "• Nginx Status: systemctl status nginx"
echo "• SSL Renewal: certbot renew"
echo ""
echo "Configuration Files:"
echo "• Backend Config: $PROJECT_PATH/backend/.env"
echo "• Frontend Config: $PROJECT_PATH/frontend/.env"
echo "• Nginx Config: /etc/nginx/sites-available/bolibooks"
echo "• PM2 Config: $PROJECT_PATH/pm2.ecosystem.js"
echo ""
echo "Next Steps:"
echo "1. Update payment keys in backend/.env (Stripe, PayPal)"
echo "2. Configure SMTP settings for email notifications"
echo "3. Set up backups and monitoring"
echo "4. Review security settings"
echo "=========================================="

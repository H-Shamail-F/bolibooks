#!/usr/bin/env bash
# BoliBooks Automated Installer for Ubuntu/Debian
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/your-org/bolibooks/main/scripts/install/install-ubuntu.sh -o install-ubuntu.sh
#   sudo bash install-ubuntu.sh -d yourdomain.com -e admin@yourdomain.com [-a api.yourdomain.com]
#
# Flags:
#   -d  PRIMARY_DOMAIN (required)  e.g., bolibooks.com
#   -a  API_DOMAIN (optional)      e.g., api.bolibooks.com (defaults to PRIMARY_DOMAIN/api path)
#   -e  ADMIN_EMAIL (required)     for SSL certificate registration
#   -p  PROJECT_PATH (optional)    default: /var/www/bolibooks
#   -b  BRANCH (optional)          default: main
#   -r  REPO (optional)            e.g., https://github.com/your-org/bolibooks.git
#   -n  NO_SSL (optional)          skip certbot ssl setup
set -euo pipefail

PRIMARY_DOMAIN=""
API_DOMAIN=""
ADMIN_EMAIL=""
PROJECT_PATH="/var/www/bolibooks"
REPO=""
BRANCH="main"
NO_SSL=0

while getopts ":d:a:e:p:r:b:n" opt; do
  case $opt in
    d) PRIMARY_DOMAIN="$OPTARG" ;;
    a) API_DOMAIN="$OPTARG" ;;
    e) ADMIN_EMAIL="$OPTARG" ;;
    p) PROJECT_PATH="$OPTARG" ;;
    r) REPO="$OPTARG" ;;
    b) BRANCH="$OPTARG" ;;
    n) NO_SSL=1 ;;
    \?) echo "Invalid option -$OPTARG" >&2; exit 1 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; exit 1 ;;
  esac
done

if [[ -z "$PRIMARY_DOMAIN" || -z "$ADMIN_EMAIL" ]]; then
  echo "Error: -d PRIMARY_DOMAIN and -e ADMIN_EMAIL are required" >&2
  exit 1
fi

if [[ -z "${API_DOMAIN}" ]]; then
  API_DOMAIN="$PRIMARY_DOMAIN" # use path-based /api
fi

echo "==> Installing prerequisites (curl, git)..."
apt-get update -y
apt-get install -y curl git

# Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 18.x"
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
fi

# PM2
if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing PM2"
  npm install -g pm2
fi

# Nginx
if ! command -v nginx >/dev/null 2>&1; then
  echo "==> Installing Nginx"
  apt-get install -y nginx
fi

# Certbot
if [[ $NO_SSL -eq 0 ]]; then
  if ! command -v certbot >/dev/null 2>&1; then
    echo "==> Installing Certbot"
    apt-get install -y certbot python3-certbot-nginx
  fi
fi

# Project provisioning
mkdir -p "$PROJECT_PATH"
cd "$PROJECT_PATH"

if [[ -n "$REPO" ]]; then
  echo "==> Cloning repo $REPO (branch $BRANCH)"
  if [[ -d .git ]]; then
    git fetch --all
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
  else
    git clone -b "$BRANCH" "$REPO" .
  fi
else
  echo "==> Using existing project directory: $PROJECT_PATH"
fi

# Environment files
echo "==> Configuring environment files"
if [[ -f backend/.env.production ]]; then
  cp -n backend/.env.production backend/.env || true
fi
if [[ -f frontend/.env.production ]]; then
  cp -n frontend/.env.production frontend/.env || true
fi

# Update backend .env
BACKEND_ENV_FILE="backend/.env"
if [[ -f "$BACKEND_ENV_FILE" ]]; then
  sed -i "s|^CLIENT_URL=.*|CLIENT_URL=https://$PRIMARY_DOMAIN|" "$BACKEND_ENV_FILE" || true
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$PROJECT_PATH/database.sqlite|" "$BACKEND_ENV_FILE" || true
  # Generate JWT secret if placeholder
  if grep -q "your-super-secure-jwt-secret" "$BACKEND_ENV_FILE"; then
    JWT=$(tr -dc 'A-Za-z0-9!@#$%^&*()_+{}|:<>?=' </dev/urandom | head -c 64)
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT|" "$BACKEND_ENV_FILE"
  fi
fi

# Update frontend .env
FRONTEND_ENV_FILE="frontend/.env"
if [[ -f "$FRONTEND_ENV_FILE" ]]; then
  if [[ "$API_DOMAIN" == "$PRIMARY_DOMAIN" ]]; then
    # Path-based API
    sed -i "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=https://$PRIMARY_DOMAIN/api|" "$FRONTEND_ENV_FILE" || true
  else
    sed -i "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=https://$API_DOMAIN|" "$FRONTEND_ENV_FILE" || true
  fi
  sed -i "s|^REACT_APP_BASE_URL=.*|REACT_APP_BASE_URL=https://$PRIMARY_DOMAIN|" "$FRONTEND_ENV_FILE" || true
fi

# Install dependencies and build
echo "==> Installing backend dependencies"
(cd backend && npm install --production)

echo "==> Installing frontend dependencies & building"
(cd frontend && npm install --production && npm run build)

# PM2 setup
echo "==> Configuring PM2"
# Write a minimal ecosystem if not present
if [[ ! -f pm2.ecosystem.js ]]; then
  cat > pm2.ecosystem.js <<'EOF'
module.exports = {
  apps: [
    {
      name: 'bolibooks-backend',
      script: './backend/src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 5000 },
    }
  ]
}
EOF
fi
pm2 start pm2.ecosystem.js || pm2 reload pm2.ecosystem.js
pm2 save
pm2 startup systemd -u $(whoami) --hp $(eval echo ~$USER) >/dev/null 2>&1 || true

# Nginx config
echo "==> Configuring Nginx"
NGINX_SITE="/etc/nginx/sites-available/bolibooks"
cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    server_name $PRIMARY_DOMAIN www.$PRIMARY_DOMAIN;
    location / {
        root $PROJECT_PATH/frontend/build;
        try_files \$uri \$uri/ /index.html;
    }
    location /uploads/ {
        alias $PROJECT_PATH/backend/uploads/;
    }
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
}
EOF

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/bolibooks
nginx -t
systemctl reload nginx

# SSL (optional)
if [[ $NO_SSL -eq 0 ]]; then
  echo "==> Obtaining SSL certificate via Certbot"
  certbot --nginx --non-interactive --agree-tos -m "$ADMIN_EMAIL" -d "$PRIMARY_DOMAIN" -d "www.$PRIMARY_DOMAIN" || echo "Certbot failed or already configured"
fi

echo "==> Installation complete"
echo "Frontend:  https://$PRIMARY_DOMAIN"
echo "API:       https://$PRIMARY_DOMAIN/api"
echo "PM2 list:  pm2 ls"
echo "Logs:      pm2 logs"


#!/usr/bin/env bash
# BoliBooks macOS Installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/your-org/bolibooks/main/scripts/install/install-macos.sh | bash -s -- -d bolibooks.local -p ~/bolibooks
#
# Flags:
#   -d  DOMAIN (required)     e.g., bolibooks.local
#   -p  PROJECT_PATH (optional)  default: ~/bolibooks
#   -r  REPO (optional)       git repository URL

set -euo pipefail

DOMAIN=""
PROJECT_PATH="$HOME/bolibooks"
REPO=""

while getopts ":d:p:r:" opt; do
  case $opt in
    d) DOMAIN="$OPTARG" ;;
    p) PROJECT_PATH="$OPTARG" ;;
    r) REPO="$OPTARG" ;;
    \?) echo "Invalid option -$OPTARG" >&2; exit 1 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; exit 1 ;;
  esac
done

if [[ -z "$DOMAIN" ]]; then
  echo "Error: -d DOMAIN is required" >&2
  exit 1
fi

# Install Homebrew if not present
if ! command -v brew >/dev/null 2>&1; then
  echo "==> Installing Homebrew"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Node.js if not present
if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js via Homebrew"
  brew install node
fi

# Install PM2 if not present
if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing PM2"
  npm install -g pm2
fi

mkdir -p "$PROJECT_PATH"
cd "$PROJECT_PATH"

# Clone or use existing code
if [[ -n "$REPO" ]]; then
  echo "==> Cloning $REPO"
  git clone "$REPO" . || { git fetch --all && git reset --hard origin/main; }
else
  echo "==> Using existing project directory"
fi

# Environment setup
echo "==> Configuring environment files"
if [[ -f backend/.env.production ]]; then
  cp -n backend/.env.production backend/.env 2>/dev/null || true
fi
if [[ -f frontend/.env.production ]]; then
  cp -n frontend/.env.production frontend/.env 2>/dev/null || true
fi

# Update env values
if [[ -f backend/.env ]]; then
  sed -i '' "s|^CLIENT_URL=.*|CLIENT_URL=http://$DOMAIN|" backend/.env
  sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=$PROJECT_PATH/database.sqlite|" backend/.env
  # Generate JWT secret if placeholder
  if grep -q "your-super-secure-jwt-secret" backend/.env; then
    JWT=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()_+{}|:<>?=' </dev/urandom | head -c 64)
    sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$JWT|" backend/.env
  fi
fi

if [[ -f frontend/.env ]]; then
  sed -i '' "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=http://$DOMAIN/api|" frontend/.env
  sed -i '' "s|^REACT_APP_BASE_URL=.*|REACT_APP_BASE_URL=http://$DOMAIN|" frontend/.env
fi

# Install dependencies
echo "==> Installing backend dependencies"
(cd backend && npm install --production)

echo "==> Installing frontend dependencies and building"
(cd frontend && npm install --production && npm run build)

# PM2 setup
echo "==> Configuring PM2"
if [[ ! -f pm2.ecosystem.js ]]; then
  cat > pm2.ecosystem.js <<'EOF'
module.exports = {
  apps: [
    {
      name: 'bolibooks-backend',
      script: './backend/src/server.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5000 }
    }
  ]
}
EOF
fi

pm2 start pm2.ecosystem.js || pm2 reload pm2.ecosystem.js
pm2 save

echo "==> Installation complete!"
echo "Backend: http://localhost:5000/api/health"
echo "Frontend build: $PROJECT_PATH/frontend/build"
echo ""
echo "To serve the frontend in development mode:"
echo "  cd $PROJECT_PATH/frontend && npm start"
echo ""
echo "To serve the built frontend:"
echo "  npx serve -s $PROJECT_PATH/frontend/build -l 3000"
echo ""
echo "PM2 commands:"
echo "  pm2 ls"
echo "  pm2 logs"
echo "  pm2 restart all"

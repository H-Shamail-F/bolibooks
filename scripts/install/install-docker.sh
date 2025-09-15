#!/usr/bin/env bash
# BoliBooks Docker Installer with Traefik & SSL
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/your-org/bolibooks/main/scripts/install/install-docker.sh | bash -s -- -d bolibooks.com -e admin@bolibooks.com
#
# Flags:
#   -d  DOMAIN (required)     e.g., bolibooks.com
#   -e  EMAIL (required)      for SSL certificate
#   -p  PATH (optional)       default: /opt/bolibooks
#   -r  REPO (optional)       git repository URL

set -euo pipefail

DOMAIN=""
EMAIL=""
PROJECT_PATH="/opt/bolibooks"
REPO=""

while getopts ":d:e:p:r:" opt; do
  case $opt in
    d) DOMAIN="$OPTARG" ;;
    e) EMAIL="$OPTARG" ;;
    p) PROJECT_PATH="$OPTARG" ;;
    r) REPO="$OPTARG" ;;
    \?) echo "Invalid option -$OPTARG" >&2; exit 1 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; exit 1 ;;
  esac
done

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Error: -d DOMAIN and -e EMAIL are required" >&2
  exit 1
fi

# Install Docker & Docker Compose if needed
if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker"
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  usermod -aG docker "$USER" || true
fi

if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  echo "==> Installing Docker Compose"
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
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

# Create .env file for Docker Compose
cat > .env <<EOF
DOMAIN=$DOMAIN
EMAIL=$EMAIL
CLIENT_URL=https://$DOMAIN
REACT_APP_API_URL=https://$DOMAIN/api
REACT_APP_BASE_URL=https://$DOMAIN
JWT_SECRET=$(openssl rand -base64 32)
EOF

# Create Docker Compose with Traefik
cat > docker-compose.prod.yml <<'EOF'
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: traefik
    restart: unless-stopped
    command:
      - "--api.dashboard=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=${EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "letsencrypt:/letsencrypt"
    networks:
      - web

  backend:
    build: ./backend
    container_name: bolibooks-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 5000
      CLIENT_URL: https://${DOMAIN}
      JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: /app/data/database.sqlite
    volumes:
      - backend_data:/app/data
      - backend_uploads:/app/uploads
    networks:
      - web
      - internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`${DOMAIN}`) && PathPrefix(`/api`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.backend.loadbalancer.server.port=5000"

  frontend:
    build:
      context: ./frontend
      args:
        REACT_APP_API_URL: https://${DOMAIN}/api
        REACT_APP_BASE_URL: https://${DOMAIN}
    container_name: bolibooks-frontend
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"
      # Redirect HTTP to HTTPS
      - "traefik.http.routers.frontend-http.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.frontend-http.entrypoints=web"
      - "traefik.http.routers.frontend-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"

volumes:
  backend_data:
  backend_uploads:
  letsencrypt:

networks:
  web:
    external: true
  internal:
    external: false
EOF

# Create external network for Traefik
docker network create web 2>/dev/null || true

echo "==> Building and starting services"
docker-compose -f docker-compose.prod.yml up -d --build

echo "==> Installation complete!"
echo "Your BoliBooks instance should be available at: https://$DOMAIN"
echo "Monitor logs with: docker-compose -f docker-compose.prod.yml logs -f"
echo "Manage services: docker-compose -f docker-compose.prod.yml [up|down|restart]"
EOF

# Frontend Dockerfile for BoliBooks

# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --silent

# Copy source code
COPY . .

# Build arguments for environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_BASE_URL
ARG REACT_APP_COMPANY_NAME
ARG REACT_APP_STRIPE_PUBLIC_KEY
ARG REACT_APP_PAYPAL_CLIENT_ID

# Set environment variables for build
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_BASE_URL=$REACT_APP_BASE_URL
ENV REACT_APP_COMPANY_NAME=$REACT_APP_COMPANY_NAME
ENV REACT_APP_STRIPE_PUBLIC_KEY=$REACT_APP_STRIPE_PUBLIC_KEY
ENV REACT_APP_PAYPAL_CLIENT_ID=$REACT_APP_PAYPAL_CLIENT_ID

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

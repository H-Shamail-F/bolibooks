# Backend Dockerfile for BoliBooks

# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Add package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application source
COPY . .

# Create directories for data, uploads, and logs
RUN mkdir -p /app/data /app/uploads /app/logs

# Set proper permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bolibooks -u 1001 && \
    chown -R bolibooks:nodejs /app

# Install curl for health checks
RUN apk --no-cache add curl

# Switch to non-root user
USER bolibooks

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "src/server.js"]

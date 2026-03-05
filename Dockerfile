# Multi-stage Dockerfile for ShadowLink
# Builds frontend and serves everything from the backend

# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --production=false
COPY frontend/ ./
RUN npm run build

# Stage 2: Production backend with built frontend
FROM node:18-alpine

WORKDIR /app

# Copy backend files
COPY backend/package*.json ./
RUN npm ci --production

COPY backend/ ./

# Copy built frontend from Stage 1
COPY --from=frontend-build /app/frontend/build ./frontend-build

# Create logs directory
RUN mkdir -p logs

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD node healthcheck.js || exit 1

# Start the server
CMD ["node", "server.js"]

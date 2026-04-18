# Build stage
FROM node:22-bookworm AS builder
WORKDIR /app

# Setup chatbot-worker directory structure
RUN mkdir -p chatwork
COPY ./chatbot-worker/package*.json chatwork/

# Copy shared to ../shared relative to chatwork (where package.json is)
COPY ./shared chatwork/../shared

WORKDIR /app/chatwork
RUN npm install --ignore-scripts

# Build chatbot-worker
COPY ./chatbot-worker/src ./src
COPY ./chatbot-worker/tsconfig.json ./
RUN npm run build

# Production stage
FROM node:22-bookworm-slim AS production
WORKDIR /app

# Create non-root user
RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup appuser

# Copy only needed files from builder
COPY --from=builder --chown=appuser:appgroup /app/chatwork/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/chatwork/package*.json ./
COPY --from=builder --chown=appuser:appgroup /app/chatwork/node_modules ./node_modules

# Install production deps only
RUN npm ci --only=production --ignore-scripts

USER appuser

# Healthcheck - worker listens on port 3002
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "dist/index.js"]

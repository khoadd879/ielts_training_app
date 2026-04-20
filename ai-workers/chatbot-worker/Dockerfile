# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS shared-builder

WORKDIR /app/shared

COPY ./shared/package*.json ./
COPY ./shared/tsconfig.json ./
COPY ./shared/src ./src

RUN --mount=type=cache,target=/root/.npm \
  npm install --ignore-scripts --no-audit --no-fund --prefer-offline \
  --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
RUN npm run build

FROM node:22-alpine AS builder

WORKDIR /app/chatbot-worker

COPY ./chatbot-worker/package*.json ./
COPY ./chatbot-worker/tsconfig.json ./
COPY --from=shared-builder /app/shared ../shared

RUN --mount=type=cache,target=/root/.npm \
  npm install --ignore-scripts --no-audit --no-fund --prefer-offline \
  --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY ./chatbot-worker/src ./src

RUN npm run build

FROM node:22-alpine

WORKDIR /app/chatbot-worker

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/chatbot-worker/package*.json ./
COPY --from=builder --chown=appuser:appgroup /app/chatbot-worker/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/chatbot-worker/dist ./dist
COPY --from=shared-builder --chown=appuser:appgroup /app/shared ../shared

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "dist/index.js"]

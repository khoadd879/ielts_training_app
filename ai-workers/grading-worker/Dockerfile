# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS shared-builder

WORKDIR /app/shared

COPY ./ai-workers/shared/package*.json ./
COPY ./ai-workers/shared/tsconfig.json ./
COPY ./ai-workers/shared/src ./src

RUN --mount=type=cache,target=/root/.npm \
  npm install --ignore-scripts --no-audit --no-fund --prefer-offline \
  --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
RUN npm run build

FROM node:22-alpine AS builder

WORKDIR /app/grading-worker

COPY ./ai-workers/grading-worker/package*.json ./
COPY ./ai-workers/grading-worker/tsconfig.json ./
COPY --from=shared-builder /app/shared ../shared
COPY ./prisma ../prisma

RUN --mount=type=cache,target=/root/.npm \
  npm install --ignore-scripts --no-audit --no-fund --prefer-offline \
  --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

RUN npx prisma generate --schema=/app/prisma/schema.prisma

COPY ./ai-workers/grading-worker/src ./src

RUN npm run build

FROM node:22-alpine

WORKDIR /app/grading-worker

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/grading-worker/package*.json ./
COPY --from=builder --chown=appuser:appgroup /app/grading-worker/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/grading-worker/dist ./dist
COPY --from=shared-builder --chown=appuser:appgroup /app/shared ../shared

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]

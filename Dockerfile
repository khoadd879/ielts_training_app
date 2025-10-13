# Base image
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy only package files first (optimize caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the NestJS app
RUN npm run build

# ===========================
# Production stage
# ===========================

FROM node:22-alpine

WORKDIR /app

# Copy only needed files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Set Node options to prevent memory issue
ENV NODE_OPTIONS=--max-old-space-size=1024

# Start app in production
CMD ["node", "dist/main.js"]

# Stage 1: Build Frontend SPA
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend dependencies
FROM node:22-alpine AS backend-builder
WORKDIR /app
# Pre-create data directory owned by default 'node' user (UID 1000)
RUN mkdir -p data && chown -R 1000:1000 data
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src

# Stage 3: Runner using official lightweight Alpine image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/pchclk.db

# Copy files and ensure ownership by 'node' user
COPY --from=backend-builder --chown=node:node /app/data ./data
COPY --from=backend-builder --chown=node:node /app/node_modules ./node_modules
COPY --from=backend-builder --chown=node:node /app/package*.json ./
COPY --from=backend-builder --chown=node:node /app/src ./src

# Copy built static frontend SPA assets
COPY --from=frontend-builder --chown=node:node /app/dist ./public

USER node

EXPOSE 3000

# Healthcheck using official Node runtime binary
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]

CMD ["node", "src/server.js"]

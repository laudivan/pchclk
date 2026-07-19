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
RUN mkdir -p data && chown -R 65532:65532 data
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src

# Stage 3: Runner
FROM gcr.io/distroless/nodejs22-debian12 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/pchclk.db

# Copy pre-created data directory and dependencies
COPY --from=backend-builder --chown=nonroot:nonroot /app/data ./data
COPY --from=backend-builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=backend-builder --chown=nonroot:nonroot /app/package*.json ./
COPY --from=backend-builder --chown=nonroot:nonroot /app/src ./src

# Copy built frontend assets to serve statically
COPY --from=frontend-builder --chown=nonroot:nonroot /app/dist ./public

USER nonroot

EXPOSE 3000

# Automated healthcheck using native Node.js fetch inside distroless (no shell format)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]

CMD ["src/server.js"]

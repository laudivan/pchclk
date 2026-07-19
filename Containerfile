# Stage 1: Build the Vue SPA (frontend assets)
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Stage 2: Production runner (backend + built frontend)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/pchclk.db

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY src/ ./src/

# Copy built frontend SPA into /public (Express serves this as static)
COPY --from=frontend-builder /app/dist ./public

# Pre-create persistent data directory owned by the unprivileged 'node' user
RUN mkdir -p data && chown -R node:node data /app

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]

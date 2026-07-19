FROM node:22-alpine AS builder
WORKDIR /app
COPY src/ ./src/ 
COPY public/ ./public/
COPY package*.json .
RUN ls -la && \
  npm ci && \
  mv ./src/index.html ./src/vite.config.js . && \
  npm run build && \
  mkdir -p data && \
  chown -R 1000:1000 data

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/pchclk.db

COPY --from=builder --chown=node:node /app/data ./data
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/dist ./public
COPY --from=builder --chown=node:node /app/index.html /app/vite.config.js .

USER node

EXPOSE 3000

# Healthcheck using official Node runtime binary
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]

CMD ["node", "src/server.js"]

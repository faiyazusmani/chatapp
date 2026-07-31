# ── Backend production image ──────────────────────────────────────────
# Multi-stage: deps stage caches node_modules; runtime stage is minimal.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Prefer npm ci (lockfile); fall back to install when no lockfile exists
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run as a non-root user (defense-in-depth)
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

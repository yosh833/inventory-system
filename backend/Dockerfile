# ============================================
# BACKEND - Multi-stage Dockerfile (tsx runtime)
# ============================================

# ---- Base Stage ----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# ---- Dependencies Stage ----
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# ---- Builder Stage ----
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3001

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
# Copy source code (tsx runs TypeScript directly)
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["tsx", "src/index.ts"]

# ---- Development Stage ----
FROM base AS development
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]
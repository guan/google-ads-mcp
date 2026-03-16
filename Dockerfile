# Multi-stage build for Google Ads MCP Server

# Stage 1: Build
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY src ./src

# Build TypeScript
RUN pnpm run build

# Stage 2: Production
FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app files
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "build/index.js"]

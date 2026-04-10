# Multi-stage build for Aksara SSO (SvelteKit + Bun)
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the SvelteKit application
RUN bun run build

# Production image
FROM oven/bun:1-alpine

# Create non-root user for security
RUN addgroup -g 1001 ssouser && \
    adduser -D -u 1001 -G ssouser ssouser

WORKDIR /app

# Copy built application from builder with correct ownership
COPY --from=builder --chown=ssouser:ssouser /app/build ./build
COPY --from=builder --chown=ssouser:ssouser /app/package.json ./
COPY --from=builder --chown=ssouser:ssouser /app/node_modules ./node_modules

USER ssouser

# Expose port (SvelteKit default is 5173, but we'll use 3001 in production)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "try { const res = await fetch('http://localhost:3001/'); process.exit(res.ok ? 0 : 1); } catch { process.exit(1); }"

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Start the SvelteKit server
CMD ["bun", "run", "build/index.js"]

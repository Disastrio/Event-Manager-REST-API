# syntax=docker/dockerfile:1

FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Application code (tests and dev tooling are not needed in the image).
COPY src ./src

# Run as the unprivileged user that ships with the Node image.
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-5000}/api/v1/health" || exit 1

CMD ["node", "src/server.js"]

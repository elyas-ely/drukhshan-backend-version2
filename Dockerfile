# -------- Build Stage --------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including dev for build step)
RUN npm ci

COPY . .

# -------- Production Stage --------
FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy application source
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["node", "src/app.js"]
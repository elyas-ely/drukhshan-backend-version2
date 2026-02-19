# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Production stage
FROM node:20-alpine

# Set node environment to production
ENV NODE_ENV=production

WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src



# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "src/app.js"]

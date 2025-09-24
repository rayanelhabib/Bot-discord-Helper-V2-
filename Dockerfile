FROM node:18-alpine

# Install system dependencies for canvas and other native modules
RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p data/logs data/cache

# Set permissions
RUN chown -R node:node /app
USER node

# Expose port (if using web features)
EXPOSE 3000

# Start the bot
CMD ["node", "index.js"]

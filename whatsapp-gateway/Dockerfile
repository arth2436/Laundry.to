FROM node:20-slim

# Only minimal deps needed for Baileys (no Chrome/Puppeteer)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install --omit=dev && npm approve-scripts @whiskeysockets/baileys protobufjs

# Copy source code
COPY . .

# /data is where Railway Volume will be mounted
# session will be saved here permanently
ENV AUTH_FOLDER=/data/auth_info_baileys

EXPOSE 5000

CMD ["node", "server.js"]

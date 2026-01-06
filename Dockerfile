FROM node:20-alpine

WORKDIR /app

# Install dependencies (Production only)
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]

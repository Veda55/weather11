FROM node:18-alpine

WORKDIR /app

# Copy only package files from app folder
COPY app/package*.json ./

RUN npm install --production

# Copy entire app folder content
COPY app/ ./

# Expose app port
EXPOSE 3000

CMD ["node", "server.js"]


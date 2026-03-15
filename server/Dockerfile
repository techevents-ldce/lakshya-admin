FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production
COPY . .

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5000
CMD ["node", "src/server.js"]

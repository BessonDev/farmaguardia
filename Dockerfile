# ---- Build Stage ----
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4321
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/farmaguardia.db
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY seed.js seed_turnos.js ./
COPY start.sh ./
RUN chmod +x start.sh
EXPOSE 4321
CMD ["./start.sh"]

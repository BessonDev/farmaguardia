# ── Build stage ──
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage ──
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY scripts/migrate.mjs ./scripts/migrate.mjs

ENV HOST=0.0.0.0
ENV PORT=8080
ENV DB_PATH=/data/farmaguardia.db

EXPOSE 8080

VOLUME ["/data"]

CMD ["sh", "-c", "node scripts/migrate.mjs && node ./dist/server/entry.mjs"]

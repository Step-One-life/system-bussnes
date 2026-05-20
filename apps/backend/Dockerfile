# TriKick backend — multi-stage build.
# Контекст сборки — корень монорепо (нужен packages/shared).

FROM node:22-alpine AS builder
WORKDIR /app

# Манифесты воркспейсов для кеша зависимостей
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

RUN npm ci

# Исходники shared + backend
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

RUN npm run build --workspace @trikick/shared \
 && npm run build --workspace apps/backend

# ── Runtime ───────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

RUN npm ci --omit=dev

# Собранные артефакты
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY apps/backend/database ./apps/backend/database
COPY apps/backend/.sequelizerc ./apps/backend/
# sequelize-cli.config.js — обычный .js, nest build его не транспилирует,
# поэтому кладём вручную рядом с собранным кодом (dist/config).
COPY apps/backend/src/config/sequelize-cli.config.js ./apps/backend/dist/config/

WORKDIR /app/apps/backend
EXPOSE 3021

# Накатываем миграции и стартуем
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node dist/main.js"]

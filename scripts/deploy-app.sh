#!/usr/bin/env bash
# deploy-app.sh — БЕЗОПАСНЫЙ деплой кода на тестовый стенд (94.19.63.62).
#
# Что делает:
#   1. Снимает дамп серверной БД (страховка).
#   2. Собирает backend Docker-образ локально, переносит на хост.
#   3. Собирает frontend, заливает статику.
#   4. Рестартует backend-контейнер (миграции накатятся автоматически).
#   5. Smoke-test.
#
# Чего НЕ делает (намеренно):
#   - НЕ затирает БД (в отличие от deploy-test.sh, который переливает
#     локальную БД в серверную — для первой инициализации).
#   - НЕ трогает nginx-конфиг.
#   - НЕ переустанавливает SSL.
#
# Требует: .env.host (SSH-доступ), apps/backend/.env (опц.), Docker, sshpass.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ── Конфиг хоста ──────────────────────────────────────────────────
[ -f .env.host ] || { echo "Нет .env.host — скопируй из .env.host.example"; exit 1; }
set -a; . ./.env.host; set +a

REMOTE="${HOST_PROJECT_DIR}"
DOMAIN="${HOST_DOMAIN}"
IMAGE="trikick-test-backend:latest"

if [ -n "${HOST_SSH_PASS:-}" ]; then
  SSH="sshpass -p ${HOST_SSH_PASS} ssh -o StrictHostKeyChecking=no -p ${HOST_SSH_PORT} ${HOST_SSH_USER}@${HOST_SSH_HOST}"
  SCP="sshpass -p ${HOST_SSH_PASS} scp -o StrictHostKeyChecking=no -P ${HOST_SSH_PORT}"
  RSYNC_RSH="sshpass -p ${HOST_SSH_PASS} ssh -o StrictHostKeyChecking=no -p ${HOST_SSH_PORT}"
else
  SSH="ssh -p ${HOST_SSH_PORT} ${HOST_SSH_USER}@${HOST_SSH_HOST}"
  SCP="scp -P ${HOST_SSH_PORT}"
  RSYNC_RSH="ssh -p ${HOST_SSH_PORT}"
fi
TARGET="${HOST_SSH_USER}@${HOST_SSH_HOST}"
STAMP=$(date +%Y%m%d-%H%M%S)

echo "════════ TriKick deploy-app → ${DOMAIN} (${HOST_SSH_HOST}) ════════"

# ── 1. Дамп серверной БД (страховка) ──────────────────────────────
echo "→ Снимаю дамп серверной БД..."
$SSH "bash -s" <<EOF
DB_USER=\$(grep '^DB_USER=' ${REMOTE}/deploy/trikick.env | cut -d= -f2)
DB_PASSWORD=\$(grep '^DB_PASSWORD=' ${REMOTE}/deploy/trikick.env | cut -d= -f2)
DB_NAME=\$(grep '^DB_NAME=' ${REMOTE}/deploy/trikick.env | cut -d= -f2)
docker exec trikick-test-db mysqldump --no-tablespaces --skip-comments \
  -u\$DB_USER -p\$DB_PASSWORD \$DB_NAME 2>/dev/null | gzip > /root/trikick-predeploy-${STAMP}.sql.gz
ls -lh /root/trikick-predeploy-${STAMP}.sql.gz
EOF
echo "  ✓ Дамп: /root/trikick-predeploy-${STAMP}.sql.gz"

# ── 2. Сборка backend образа ──────────────────────────────────────
echo "→ Сборка Docker-образа backend (linux/amd64)..."
docker build --platform linux/amd64 -f apps/backend/Dockerfile -t "${IMAGE}" .

echo "→ Перенос образа на хост..."
docker save "${IMAGE}" | gzip | $SSH 'gunzip | docker load'

# ── 3. Сборка frontend ────────────────────────────────────────────
echo "→ Сборка frontend..."
npm run build:shared
VITE_API_URL="https://${DOMAIN}/api" npm run build:frontend

echo "→ Заливка frontend-статики..."
rsync -az --delete -e "${RSYNC_RSH}" \
  apps/frontend/dist/ "${TARGET}:${REMOTE}/frontend/"

# ── 4. Заливка docker-compose (на случай если изменился) ──────────
echo "→ Заливка docker-compose..."
$SCP deploy/docker-compose.test.yml "${TARGET}:${REMOTE}/deploy/docker-compose.yml"

# ── 5. Рестарт backend (миграции накатятся автоматически) ─────────
echo "→ Рестарт backend (миграции из Dockerfile CMD)..."
$SSH "bash -s" <<EOF
set -e
cd ${REMOTE}/deploy
docker compose --env-file trikick.env stop trikick-test-backend
docker compose --env-file trikick.env rm -f trikick-test-backend
docker compose --env-file trikick.env up -d trikick-test-backend
echo "  ✓ Контейнер пересоздан, жду 20 сек на старт..."
sleep 20
docker logs trikick-test-backend 2>&1 | grep -E "migrating|migrated|ERROR" | head -20 || true
docker logs trikick-test-backend 2>&1 | tail -3
EOF

# ── 6. Smoke-test ─────────────────────────────────────────────────
echo "→ Smoke-test..."
HTTP_FRONT=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/?n=${STAMP}")
HTTP_API=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://${DOMAIN}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@trikick.ru","password":"demo1234"}')

echo "  Frontend (GET /)        → HTTP ${HTTP_FRONT}"
echo "  Backend  (POST /api/auth/login) → HTTP ${HTTP_API}"

if [ "$HTTP_FRONT" != "200" ] || [ "$HTTP_API" != "201" ] && [ "$HTTP_API" != "200" ]; then
  echo "✗ Smoke-test упал. Проверь логи: docker logs trikick-test-backend"
  exit 1
fi

echo ""
echo "════════ Деплой завершён успешно ════════"
echo "  Сайт:   https://${DOMAIN}"
echo "  Дамп:   /root/trikick-predeploy-${STAMP}.sql.gz (на сервере)"

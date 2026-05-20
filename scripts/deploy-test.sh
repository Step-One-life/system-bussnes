#!/usr/bin/env bash
# deploy-test.sh — деплой TriKick на ТЕСТОВЫЙ стенд (94.19.63.62).
#
# Что делает:
#   1. Собирает Docker-образ backend локально, переносит на хост.
#   2. Собирает frontend, заливает статику в каталог сайта.
#   3. Поднимает контейнеры trikick-test-backend + trikick-test-db.
#   4. Дампит локальную БД и заливает её в trikick-test-db.
#   5. Ставит nginx-конфиг, выпускает SSL через certbot.
#
# Требует: .env.host (SSH-доступ), deploy/trikick.test.env (test-креды),
#          apps/backend/.env (локальные DB_* для дампа), sshpass, docker.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ── Конфиг хоста ──────────────────────────────────────────────────
[ -f .env.host ] || { echo "Нет .env.host — скопируй из .env.host.example"; exit 1; }
set -a; . ./.env.host; set +a

[ -f deploy/trikick.test.env ] || { echo "Нет deploy/trikick.test.env — скопируй из trikick.test.env.example"; exit 1; }

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

echo "════════ TriKick TEST deploy → ${DOMAIN} (${HOST_SSH_HOST}) ════════"

# ── 0. Проверка уникальности на хосте ─────────────────────────────
echo "→ Проверка портов и контейнеров на хосте..."
$SSH 'bash -s' <<'CHECK'
set -e
for p in 8095 3317; do
  if ss -tln | grep -q ":$p "; then echo "ОШИБКА: порт $p занят"; exit 1; fi
done
for c in trikick-test-backend trikick-test-db; do
  if docker ps -a --format '{{.Names}}' | grep -qx "$c"; then
    echo "Контейнер $c уже существует — будет пересоздан."
  fi
done
echo "✓ Порты 8095, 3317 свободны."
CHECK

# ── 1. Сборка backend-образа ──────────────────────────────────────
echo "→ Сборка Docker-образа backend (linux/amd64)..."
docker build --platform linux/amd64 \
  -f apps/backend/Dockerfile \
  -t "${IMAGE}" .

echo "→ Перенос образа на хост..."
docker save "${IMAGE}" | gzip | $SSH 'gunzip | docker load'

# ── 2. Сборка frontend ────────────────────────────────────────────
echo "→ Сборка frontend..."
npm run build:shared
VITE_API_URL="https://${DOMAIN}/api" npm run build:frontend

# ── 3. Перенос файлов деплоя ──────────────────────────────────────
echo "→ Перенос compose-файла и env..."
$SSH "mkdir -p ${REMOTE}/deploy ${REMOTE}/frontend"
$SCP deploy/docker-compose.test.yml "${TARGET}:${REMOTE}/deploy/docker-compose.yml"
$SCP deploy/trikick.test.env "${TARGET}:${REMOTE}/deploy/trikick.env"

echo "→ Заливка frontend-статики..."
rsync -az --delete -e "${RSYNC_RSH}" \
  apps/frontend/dist/ "${TARGET}:${REMOTE}/frontend/"

# ── 4. Запуск контейнеров ─────────────────────────────────────────
echo "→ Запуск контейнеров (backend + mysql)..."
$SSH "cd ${REMOTE}/deploy && docker compose --env-file trikick.env up -d"

echo "→ Ожидание готовности MySQL..."
$SSH 'for i in $(seq 1 30); do
  if docker exec trikick-test-db mysqladmin ping -h localhost --silent 2>/dev/null; then
    echo "  MySQL готов"; break
  fi
  sleep 2
done'

# ── 5. Перенос текущей базы ───────────────────────────────────────
echo "→ Дамп локальной базы и заливка в trikick-test-db..."
LOCAL_DB_USER=$(grep '^DB_USER=' apps/backend/.env | cut -d= -f2)
LOCAL_DB_PASS=$(grep '^DB_PASSWORD=' apps/backend/.env | cut -d= -f2)
LOCAL_DB_NAME=$(grep '^DB_NAME=' apps/backend/.env | cut -d= -f2)
PROD_DB_USER=$(grep '^DB_USER=' deploy/trikick.test.env | cut -d= -f2)
PROD_DB_PASS=$(grep '^DB_PASSWORD=' deploy/trikick.test.env | cut -d= -f2)
PROD_DB_NAME=$(grep '^DB_NAME=' deploy/trikick.test.env | cut -d= -f2)

mysqldump -h 127.0.0.1 -u "${LOCAL_DB_USER}" -p"${LOCAL_DB_PASS}" \
  --no-tablespaces --skip-comments "${LOCAL_DB_NAME}" \
  | gzip > /tmp/trikick-test-dump.sql.gz

$SCP /tmp/trikick-test-dump.sql.gz "${TARGET}:/tmp/trikick-test-dump.sql.gz"
$SSH "gunzip -c /tmp/trikick-test-dump.sql.gz | docker exec -i trikick-test-db mysql -u ${PROD_DB_USER} -p${PROD_DB_PASS} ${PROD_DB_NAME} && rm /tmp/trikick-test-dump.sql.gz"
rm /tmp/trikick-test-dump.sql.gz
echo "  ✓ База перенесена."

# ── 6. nginx + SSL ────────────────────────────────────────────────
echo "→ Установка nginx-конфига..."
$SCP deploy/trick.ozma-split.com.conf "${TARGET}:/etc/nginx/conf.d/${DOMAIN}.conf"
$SSH "nginx -t && systemctl reload nginx"

echo "→ Выпуск SSL-сертификата (certbot)..."
$SSH "certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m admin@ozma-split.com --redirect || echo 'certbot: проверь DNS домена'"
$SSH "nginx -t && systemctl reload nginx"

echo ""
echo "════════ TEST-деплой завершён ════════"
echo "  Сайт:    https://${DOMAIN}"
echo "  API:     https://${DOMAIN}/api"
echo "  Swagger: https://${DOMAIN}/api/docs"

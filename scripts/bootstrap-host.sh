#!/usr/bin/env bash
# bootstrap-host.sh — подготовка свежего Ubuntu/Debian-сервера под TriKick.
# Ставит: Node.js 22, MySQL 8, nginx. Запускать на ХОСТЕ от root (или через sudo).
#
# Использование на хосте:
#   sudo bash bootstrap-host.sh
set -euo pipefail

NODE_MAJOR=22

if [ "$(id -u)" -ne 0 ]; then
  echo "Запусти от root: sudo bash bootstrap-host.sh"
  exit 1
fi

echo "→ Обновление списка пакетов..."
apt-get update -y

echo "→ Установка базовых утилит..."
apt-get install -y curl ca-certificates gnupg rsync git

# ── Node.js 22 (NodeSource) ───────────────────────────────────────
if command -v node >/dev/null 2>&1 && node -v | grep -q "^v${NODE_MAJOR}\."; then
  echo "✓ Node.js $(node -v) уже установлен."
else
  echo "→ Установка Node.js ${NODE_MAJOR}..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
echo "  node: $(node -v), npm: $(npm -v)"

# ── MySQL 8 ───────────────────────────────────────────────────────
if command -v mysql >/dev/null 2>&1; then
  echo "✓ MySQL уже установлен."
else
  echo "→ Установка MySQL server..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server
fi
systemctl enable --now mysql

# ── nginx ─────────────────────────────────────────────────────────
if command -v nginx >/dev/null 2>&1; then
  echo "✓ nginx уже установлен."
else
  echo "→ Установка nginx..."
  apt-get install -y nginx
fi
systemctl enable --now nginx

# ── pm2 для управления backend-процессом ──────────────────────────
if command -v pm2 >/dev/null 2>&1; then
  echo "✓ pm2 уже установлен."
else
  echo "→ Установка pm2..."
  npm install -g pm2
fi

echo ""
echo "✓ Хост подготовлен: Node $(node -v), MySQL, nginx, pm2."
echo ""
echo "Дальнейшие шаги (вручную на хосте):"
echo "  1. Создать базу и пользователя MySQL:"
echo "     mysql -e \"CREATE DATABASE trick_step CHARACTER SET utf8mb4;\""
echo "  2. Положить apps/backend/.env с боевыми кредами БД и JWT."
echo "  3. Настроить nginx: статика apps/frontend/dist + proxy /api → :3021."
echo "  4. Зарегистрировать backend в pm2:"
echo "     cd <project>/apps/backend && pm2 start dist/main.js --name trikick-api"
echo "     pm2 save && pm2 startup"
echo "  5. С локальной машины: make deploy"

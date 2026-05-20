# TriKick — Makefile
# Локальная разработка и деплой на тестовый стенд.
#
# Деплой читает .env.host (скопируй из .env.host.example).
# backend + MySQL — в Docker-контейнерах на хосте, frontend — статика.

SHELL := /bin/bash

# ── Параметры хоста из .env.host ──────────────────────────────────
ifneq (,$(wildcard .env.host))
  include .env.host
  export
endif

.DEFAULT_GOAL := help

# ── Справка ───────────────────────────────────────────────────────
.PHONY: help
help:
	@echo "TriKick — команды:"
	@echo ""
	@echo "  Локально:"
	@echo "    make install        — установить зависимости всех воркспейсов"
	@echo "    make build          — собрать shared + backend + frontend"
	@echo "    make migrate        — накатить миграции БД"
	@echo "    make seed           — заполнить БД демо-данными"
	@echo "    make dev            — запустить frontend (dev)"
	@echo "    make dev-backend    — запустить backend (watch)"
	@echo "    make update         — git pull + install + build + migrate"
	@echo ""
	@echo "  Деплой (.env.host):"
	@echo "    make deploy-test           — выкатить на тестовый стенд (Docker + БД + nginx + SSL)"
	@echo "    make deploy-test-frontend  — обновить только frontend на тесте"

# ── Локальная разработка ──────────────────────────────────────────
.PHONY: install
install:
	npm install

.PHONY: build
build:
	npm run build:all

.PHONY: migrate
migrate:
	npm run migrate

.PHONY: seed
seed:
	npm run seed

.PHONY: dev
dev:
	npm run dev

.PHONY: dev-backend
dev-backend:
	npm run dev:backend

# Подтянуть изменения и привести проект в рабочее состояние.
.PHONY: update
update:
	git pull --ff-only
	npm install
	npm run build:all
	npm run migrate
	@echo "✓ Проект обновлён."

# ── Проверка готовности к деплою ──────────────────────────────────
.PHONY: check-host
check-host:
	@if [ ! -f .env.host ]; then \
		echo "Ошибка: нет .env.host — скопируй из .env.host.example и заполни."; \
		exit 1; \
	fi

# ── Деплой (Docker) ───────────────────────────────────────────────
# Стратегия: backend + MySQL — в Docker-контейнерах на хосте,
# frontend — статика, раздаётся nginx хоста. Полная логика —
# в scripts/deploy-test.sh (сборка образа, перенос, БД, nginx, SSL).

# Тестовый стенд (94.19.63.62, trick.ozma-split.com)
.PHONY: deploy-test
deploy-test: check-host
	@bash scripts/deploy-test.sh

# Только пересборка и обновление frontend-статики на тестовом хосте.
.PHONY: deploy-test-frontend
deploy-test-frontend: check-host
	@bash -c 'set -a; . ./.env.host; set +a; \
		npm run build:shared && \
		VITE_API_URL="https://$$HOST_DOMAIN/api" npm run build:frontend && \
		rsync -az --delete -e "sshpass -p $$HOST_SSH_PASS ssh -o StrictHostKeyChecking=no -p $$HOST_SSH_PORT" \
			apps/frontend/dist/ $$HOST_SSH_USER@$$HOST_SSH_HOST:$$HOST_PROJECT_DIR/frontend/'
	@echo "✓ Frontend обновлён."

# TriKick

Менеджер тренировок: учёт групп, учеников, абонементов, тренировок и финансов.

Монорепо:

```
packages/shared/   — общие TS-типы (наследуются фронтом и бэком)
apps/backend/      — NestJS + Fastify + Sequelize + MySQL API
apps/frontend/     — React + TypeScript + Vite + Ant Design
plans/             — план миграции и архитектурные документы
```

## Требования

- Node.js 22.x (зафиксировано в `engines` всех `package.json`)
- MySQL 8 (локально установленный)
- npm 11+

## Локальный запуск

### 1. Зависимости

```bash
make install
# или: npm install
```

### 2. База данных

Нужна работающая MySQL и созданная база. Параметры подключения —
в `apps/backend/.env` (скопируй из `apps/backend/.env.example`):

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=ваш_пароль
DB_NAME=trick_step
JWT_SECRET=любая-строка
CORS_ORIGIN=http://localhost:3020
```

Создать базу, если её нет:

```bash
mysql -u root -p -e "CREATE DATABASE trick_step CHARACTER SET utf8mb4;"
```

Фронтенд читает адрес API из `apps/frontend/.env`
(скопируй из `apps/frontend/.env.example`):

```dotenv
VITE_API_URL=http://localhost:3021/api
```

### 3. Миграции и демо-данные

```bash
make migrate    # создаёт таблицы
make seed       # заполняет демо-данными (опционально)
```

Демо-аккаунт после `seed`: **demo@trikick.ru** / **demo1234**

### 4. Запуск

В двух терминалах:

```bash
make dev-backend   # API на http://localhost:3021
make dev           # фронтенд на http://localhost:3020
```

- Приложение: http://localhost:3020
- Swagger UI: http://localhost:3021/api/docs

## Команды

| Команда | Что делает |
|---------|-----------|
| `make install` | Установить зависимости всех воркспейсов |
| `make build` | Собрать shared + backend + frontend |
| `make migrate` | Накатить миграции БД |
| `make seed` | Заполнить БД демо-данными |
| `make dev` | Запустить frontend (dev-режим) |
| `make dev-backend` | Запустить backend (watch-режим) |
| `make update` | `git pull` + install + build + migrate |
| `make bootstrap-host` | Подготовить свежий хост (Node, MySQL, nginx, pm2) |
| `make deploy` | Собрать и выкатить backend + frontend на хост |
| `make deploy-backend` | Выкатить только backend (с миграциями) |
| `make deploy-frontend` | Выкатить только frontend |

## Синхронизация с Google Календарём

Односторонняя выгрузка расписания тренера в его Google Календарь: создал /
изменил / удалил тренировку в TriKick → событие появляется / меняется /
удаляется в Google. Источник правды — всегда база TriKick, Google только
отражает. Каждый тренер подключает **свой** Google-аккаунт (per-user OAuth).

**Как работает.** При мутации тренировки `TrainingService` кладёт задачу в
аутбокс-таблицу (`calendar_sync_tasks`); фоновый воркер (`@nestjs/schedule`,
каждые ~20 c) разбирает очередь и пишет в Google Calendar API с автоповторами.
Id события выводится из id тренировки детерминированно — операции идемпотентны
(insert→patch при конфликте, delete 404/410 = успех). Часовой пояс берётся из
Google-аккаунта. Тренировка без времени не синхронизируется. При отзыве доступа
подключение переходит в статус «нужно переподключить», тренировки при этом
спокойно сохраняются.

**Код:** `apps/backend/src/modules/calendar/` (модуль, контроллер, сервисы,
воркер), врезки в `apps/backend/src/modules/training/training.service.ts`;
фронт — `apps/frontend/src/pages/settings/` и
`apps/frontend/src/entities/calendar/calendar.repo.ts`. Таблицы:
`calendar_connections`, `calendar_sync_tasks`.

### Настройка (один раз)

1. [console.cloud.google.com](https://console.cloud.google.com) → создать проект.
2. **APIs & Services → Library** → включить **Google Calendar API**.
3. **OAuth consent screen** → тип **External**; добавить scope
   `https://www.googleapis.com/auth/calendar`; добавить себя в **Test users**.
4. **Credentials → Create Credentials → OAuth client ID** → **Web application**;
   Authorized redirect URI: `http://localhost:3021/api/calendar/google/callback`.
5. Скопировать **Client ID** и **Client secret**.

Добавить в `apps/backend/.env` (без этих переменных синхронизация просто
неактивна — приложение работает как обычно):

```dotenv
GOOGLE_OAUTH_CLIENT_ID=<client id>
GOOGLE_OAUTH_CLIENT_SECRET=<client secret>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3021/api/calendar/google/callback
# ключ шифрования refresh-токенов: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CALENDAR_TOKEN_ENC_KEY=<длинная случайная строка>
```

### Подключение

В приложении: **Настройки → Подключить Google** → окно согласия Google
(в testing-режиме: *Advanced → Go to TriKick*) → выбрать существующий
календарь или создать новый «TriKick». После выбора всё будущее расписание
выгружается автоматически (первые события — в течение ~20 c); кнопка
«Синхронизировать всё» повторяет полную выгрузку.

Подробности — спецификация и план:
- `docs/superpowers/specs/2026-06-04-google-calendar-sync-design.md`
- `docs/superpowers/plans/2026-06-04-google-calendar-sync.md`

**Планируется (Фаза 2):** универсальная подписка ICS (`webcal://`) для Apple
Calendar / Outlook — одна ссылка-лента для тех, кому не нужен push-доступ
(обновляется по расписанию приложения-получателя, только чтение).

## Деплой

Деплой переносит собранные артефакты на удалённый хост по SSH (rsync).
Хост — обычный сервер с Node 22 и MySQL (без Docker).

### Настройка

Скопируй `.env.host.example` → `.env.host` и заполни:

```dotenv
HOST_SSH_USER=deploy
HOST_SSH_HOST=123.45.67.89
HOST_SSH_PORT=22
HOST_PROJECT_DIR=/var/www/trikick
HOST_RESTART_CMD=pm2 restart trikick-api
```

`.env.host` в `.gitignore` — не коммитится.

### Подготовка свежего сервера

На чистом Ubuntu/Debian-хосте один раз:

```bash
make bootstrap-host
```

Скрипт (`scripts/bootstrap-host.sh`) ставит Node.js 22, MySQL 8, nginx
и pm2. После него на хосте останется вручную: создать базу, положить
`apps/backend/.env`, настроить nginx и зарегистрировать API в pm2 —
скрипт выведет точные команды.

### Выкатка

```bash
make deploy            # backend + frontend
make deploy-backend    # только backend: сборка → rsync → npm install → миграции → рестарт
make deploy-frontend   # только frontend: сборка → rsync статики
```

`deploy-backend` накатывает миграции на хосте автоматически. На хосте
должны лежать `apps/backend/.env` с боевыми кредами БД и настроен
способ запуска API (`HOST_RESTART_CMD` — pm2/systemd/др.).

Раздачу `apps/frontend/dist` и проксирование `/api` на бэкенд
настраивает веб-сервер хоста (nginx и т.п.).

# Google Calendar Sync Implementation Plan (Фаза 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Каждый тренер односторонне выгружает своё расписание в свой Google Календарь (внёс/изменил/удалил тренировку → событие появляется/меняется/удаляется), надёжно и идемпотентно.

**Architecture:** Новый изолированный `CalendarModule` (NestJS). `TrainingService` при мутациях только кладёт задачу в аутбокс-таблицу — он не знает деталей Google. Фоновый воркер (`@nestjs/schedule`) разбирает очередь с автоповторами и пишет в Google Calendar API (`googleapis`). Id события выводится из id тренировки (детерминированно), поэтому операции идемпотентны.

**Tech Stack:** NestJS + Fastify + Sequelize (sequelize-typescript) + MySQL; `googleapis`, `@nestjs/schedule`, `@nestjs/jwt`; React + Vite + antd (frontend). Спецификация: `docs/superpowers/specs/2026-06-04-google-calendar-sync-design.md`.

**Ветка:** `feat/google-calendar-sync` (от `origin/main`).

**Условные обозначения:** все пути — от корня репозитория. `BE=apps/backend`, `FE=apps/frontend`. Бэкенд запускается `npm run start:dev -w backend` (порт 3021, `nest start --watch`). Сборка фронта/бэка: `tsc`. Команды линта/сборки указаны в конкретных шагах.

---

## File Structure

**Новые файлы (backend), модуль `BE/src/modules/calendar/`:**
- `calendar.constants.ts` — провайдер, scope, интервалы, лимиты.
- `models/calendar-connection.model.ts` — подключение Google у тренера.
- `models/calendar-sync-task.model.ts` — аутбокс-задача.
- `lib/event-id.ts` — `eventIdFor(trainingId)` (чистая).
- `lib/sync-backoff.ts` — `nextRunAfter(attempts)` (чистая).
- `lib/event-builder.ts` — `buildEventResource(input)` + `computeEnd(...)` (чистые).
- `lib/event-builder.spec.ts`, `lib/sync-backoff.spec.ts`, `services/token-crypto.service.spec.ts` — юнит-тесты.
- `services/token-crypto.service.ts` — шифрование refresh-токена (AES-256-GCM).
- `services/calendar-connection.service.ts` — доступ к таблице подключений.
- `services/google-oauth.service.ts` — обёртка над googleapis (auth url, обмен кода, список/создание календарей, insert/patch/delete события).
- `services/calendar-sync.service.ts` — `enqueueUpsert` / `enqueueDelete` / `backfill` (то, что зовёт `TrainingService`).
- `services/calendar-sync.worker.ts` — `@Interval`-воркер.
- `dto/select-calendar.dto.ts` — тело `POST /calendar/select`.
- `calendar.controller.ts` — OAuth + управление.
- `calendar.module.ts` — сборка модуля.

**Изменяемые файлы (backend):**
- `BE/package.json` — зависимости + тест-скрипт.
- `BE/jest.config.js` (новый) + `BE/tsconfig.spec.json` (новый) — минимальная тест-инфра.
- `BE/src/config/configuration.ts` — google + tokenEncKey.
- `BE/src/config/env.validation.ts` — новые опциональные env.
- `BE/src/app.module.ts` — `ScheduleModule.forRoot()` + `CalendarModule`.
- `BE/src/modules/training/training.service.ts` — врезки enqueue.
- `BE/src/modules/training/training.module.ts` — импорт `CalendarModule`.
- `BE/database/migrations/2026060400000{1,2}-*.js` — 2 миграции.
- `BE/.env.example` (если есть) / `.env` — новые переменные.

**Новые/изменяемые файлы (frontend):**
- `FE/src/entities/calendar/calendar.repo.ts` (новый) — вызовы API + типы.
- `FE/src/pages/settings/settings-page.tsx` (новый) + `settings-page.scss` + `index.ts`.
- `FE/src/pages/settings/google-calendar-card.tsx` (новый) — блок подключения.
- `FE/src/app/routes.tsx` — маршрут `/settings`.
- `FE/src/app/layout/sidebar.tsx` — пункт «Настройки».
- `FE/src/locales/ru/translation.json`, `FE/src/locales/en/translation.json` — строки.

---

## Task 1: Зависимости и минимальная тест-инфра

**Files:**
- Modify: `apps/backend/package.json`
- Create: `apps/backend/jest.config.js`
- Create: `apps/backend/tsconfig.spec.json`

- [ ] **Step 1: Установить рантайм-зависимости**

Run:
```bash
npm install googleapis @nestjs/schedule @nestjs/jwt -w backend
```
Expected: пакеты добавлены в `apps/backend/package.json` → `dependencies`.

- [ ] **Step 2: Установить dev-зависимости для тестов**

Run:
```bash
npm install -D jest ts-jest @types/jest -w backend
```
Expected: добавлены в `devDependencies`.

- [ ] **Step 3: Создать `apps/backend/jest.config.js`**

Тесты сознательно ограничены чистыми функциями (без Nest DI / Sequelize / БД), поэтому конфиг простой:
```js
'use strict'

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.spec.json' }] },
}
```

- [ ] **Step 4: Создать `apps/backend/tsconfig.spec.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"],
    "isolatedModules": false
  },
  "include": ["src/**/*.spec.ts", "src/**/*.ts"]
}
```

- [ ] **Step 5: Добавить тест-скрипт в `apps/backend/package.json`**

В блок `"scripts"` добавить:
```json
"test": "jest"
```

- [ ] **Step 6: Проверить, что jest стартует (тестов пока нет — это ок)**

Run: `npm test -w backend`
Expected: jest запускается; вывод вида `No tests found` (exit code допускается ненулевой) — главное, что инструмент работает, конфиг валиден.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/package.json apps/backend/jest.config.js apps/backend/tsconfig.spec.json package-lock.json
git commit -m "build(backend): googleapis, @nestjs/schedule, @nestjs/jwt + минимальная jest-инфра"
```

---

## Task 2: Миграции БД (таблицы подключений и аутбокса)

**Files:**
- Create: `apps/backend/database/migrations/20260604000001-create-calendar-connections.js`
- Create: `apps/backend/database/migrations/20260604000002-create-calendar-sync-tasks.js`

- [ ] **Step 1: Миграция `calendar_connections`**

Создать `apps/backend/database/migrations/20260604000001-create-calendar-connections.js`:
```js
'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('calendar_connections', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false, unique: true },
      provider: { type: Sequelize.STRING, allowNull: false, defaultValue: 'google' },
      refresh_token_enc: { type: Sequelize.TEXT, allowNull: true },
      calendar_id: { type: Sequelize.STRING, allowNull: true },
      calendar_time_zone: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'disconnected' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('calendar_connections')
  },
}
```

- [ ] **Step 2: Миграция `calendar_sync_tasks`**

Создать `apps/backend/database/migrations/20260604000002-create-calendar-sync-tasks.js`:
```js
'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('calendar_sync_tasks', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false },
      training_id: { type: Sequelize.UUID, allowNull: false },
      operation: { type: Sequelize.STRING, allowNull: false },
      calendar_id: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      last_error: { type: Sequelize.TEXT, allowNull: true },
      run_after: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
    await queryInterface.addIndex('calendar_sync_tasks', ['status', 'run_after'])
    await queryInterface.addIndex('calendar_sync_tasks', ['training_id'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('calendar_sync_tasks')
  },
}
```

- [ ] **Step 3: Применить миграции**

Run: `npm run migrate -w backend`
Expected: обе миграции выполнились без ошибок; в БД появились таблицы `calendar_connections` и `calendar_sync_tasks`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/database/migrations/20260604000001-create-calendar-connections.js apps/backend/database/migrations/20260604000002-create-calendar-sync-tasks.js
git commit -m "feat(backend): миграции calendar_connections и calendar_sync_tasks"
```

---

## Task 3: Sequelize-модели

**Files:**
- Create: `apps/backend/src/modules/calendar/models/calendar-connection.model.ts`
- Create: `apps/backend/src/modules/calendar/models/calendar-sync-task.model.ts`
- Create: `apps/backend/src/modules/calendar/calendar.constants.ts`

- [ ] **Step 1: Константы**

Создать `apps/backend/src/modules/calendar/calendar.constants.ts`:
```ts
export const CALENDAR_PROVIDER = 'google'

/** Управление календарями и событиями (список, создание календаря, события). */
export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'

export type ConnectionStatus = 'disconnected' | 'connected' | 'needs_reconnect'
export type SyncOperation = 'upsert' | 'delete'
export type SyncTaskStatus = 'pending' | 'done' | 'failed'

/** Воркер просыпается каждые N мс. */
export const SYNC_INTERVAL_MS = 20_000
/** Сколько задач берём за один проход. */
export const SYNC_BATCH = 25
/** Максимум попыток до статуса failed. */
export const SYNC_MAX_ATTEMPTS = 8
```

- [ ] **Step 2: Модель `CalendarConnection`**

Создать `apps/backend/src/modules/calendar/models/calendar-connection.model.ts`:
```ts
import { Column, DataType, Table } from 'sequelize-typescript'

import { BaseEntity } from '../../../common/entities/base.entity'
import type { ConnectionStatus } from '../calendar.constants'

@Table({ tableName: 'calendar_connections' })
export class CalendarConnection extends BaseEntity {
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false, unique: true })
  declare userId: string

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'google' })
  declare provider: string

  @Column({ field: 'refresh_token_enc', type: DataType.TEXT, allowNull: true })
  declare refreshTokenEnc: string | null

  @Column({ field: 'calendar_id', type: DataType.STRING, allowNull: true })
  declare calendarId: string | null

  @Column({ field: 'calendar_time_zone', type: DataType.STRING, allowNull: true })
  declare calendarTimeZone: string | null

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'disconnected' })
  declare status: ConnectionStatus
}
```

- [ ] **Step 3: Модель `CalendarSyncTask`**

Создать `apps/backend/src/modules/calendar/models/calendar-sync-task.model.ts`:
```ts
import { Column, DataType, Table } from 'sequelize-typescript'

import { BaseEntity } from '../../../common/entities/base.entity'
import type { SyncOperation, SyncTaskStatus } from '../calendar.constants'

@Table({ tableName: 'calendar_sync_tasks' })
export class CalendarSyncTask extends BaseEntity {
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string

  @Column({ field: 'training_id', type: DataType.UUID, allowNull: false })
  declare trainingId: string

  @Column({ type: DataType.STRING, allowNull: false })
  declare operation: SyncOperation

  @Column({ field: 'calendar_id', type: DataType.STRING, allowNull: true })
  declare calendarId: string | null

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'pending' })
  declare status: SyncTaskStatus

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare attempts: number

  @Column({ field: 'last_error', type: DataType.TEXT, allowNull: true })
  declare lastError: string | null

  @Column({ field: 'run_after', type: DataType.DATE, allowNull: false })
  declare runAfter: Date
}
```

- [ ] **Step 4: Сборка бэкенда (модели компилируются)**

Run: `npx tsc -p apps/backend/tsconfig.json --noEmit`
Expected: без ошибок (модели ещё нигде не подключены — это нормально).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/calendar/calendar.constants.ts apps/backend/src/modules/calendar/models
git commit -m "feat(backend): модели CalendarConnection, CalendarSyncTask + константы"
```

---

## Task 4: Конфиг и валидация env

**Files:**
- Modify: `apps/backend/src/config/configuration.ts`
- Modify: `apps/backend/src/config/env.validation.ts`

- [ ] **Step 1: Расширить `AppConfig` и фабрику в `configuration.ts`**

В `apps/backend/src/config/configuration.ts` добавить в интерфейс `AppConfig` (после поля `corsOrigin`):
```ts
  google: {
    clientId: string
    clientSecret: string
    redirectUri: string
  }
  calendarTokenEncKey: string
  frontendUrl: string
```
И в возвращаемый объект фабрики (после `corsOrigin: ...`):
```ts
  google: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
    redirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI ??
      'http://localhost:3021/api/calendar/google/callback',
  },
  calendarTokenEncKey: process.env.CALENDAR_TOKEN_ENC_KEY ?? 'dev-insecure-key-change-me',
  frontendUrl: process.env.CORS_ORIGIN ?? 'http://localhost:3020',
```

- [ ] **Step 2: Добавить опциональные переменные в `env.validation.ts`**

В класс `EnvVariables` (после `CORS_ORIGIN`) добавить:
```ts
  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_ID?: string

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_SECRET?: string

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_REDIRECT_URI?: string

  @IsOptional()
  @IsString()
  CALENDAR_TOKEN_ENC_KEY?: string
```
(Опциональны намеренно: без них приложение стартует, синхронизация просто не активна.)

- [ ] **Step 3: Сборка**

Run: `npx tsc -p apps/backend/tsconfig.json --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/config/configuration.ts apps/backend/src/config/env.validation.ts
git commit -m "feat(backend): конфиг и env для Google Calendar (OAuth + ключ шифрования)"
```

---

## Task 5: Чистая функция id события (TDD)

**Files:**
- Create: `apps/backend/src/modules/calendar/lib/event-id.ts`
- Test: `apps/backend/src/modules/calendar/lib/event-id.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `apps/backend/src/modules/calendar/lib/event-id.spec.ts`:
```ts
import { eventIdFor } from './event-id'

describe('eventIdFor', () => {
  it('убирает дефисы и приводит к нижнему регистру', () => {
    expect(eventIdFor('A1B2C3D4-E5F6-7890-ABCD-EF1234567890')).toBe(
      'a1b2c3d4e5f67890abcdef1234567890',
    )
  })

  it('даёт валидный для Google id (32 символа [0-9a-v])', () => {
    const id = eventIdFor('11111111-2222-3333-4444-555555555555')
    expect(id).toHaveLength(32)
    expect(id).toMatch(/^[0-9a-v]+$/)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -w backend -- event-id`
Expected: FAIL — `Cannot find module './event-id'`.

- [ ] **Step 3: Реализация**

Создать `apps/backend/src/modules/calendar/lib/event-id.ts`:
```ts
/**
 * Детерминированный id события Google из id тренировки.
 * UUID без дефисов в нижнем регистре = 32 hex-символа — валидный id Google
 * Calendar (допускаются a–v и 0–9, длина 5–1024). Делает upsert/delete
 * идемпотентными без хранения id в БД.
 */
export function eventIdFor(trainingId: string): string {
  return trainingId.replace(/-/g, '').toLowerCase()
}
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `npm test -w backend -- event-id`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/calendar/lib/event-id.ts apps/backend/src/modules/calendar/lib/event-id.spec.ts
git commit -m "feat(backend): детерминированный id события Google из id тренировки"
```

---

## Task 6: Чистая функция бэкоффа (TDD)

**Files:**
- Create: `apps/backend/src/modules/calendar/lib/sync-backoff.ts`
- Test: `apps/backend/src/modules/calendar/lib/sync-backoff.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `apps/backend/src/modules/calendar/lib/sync-backoff.spec.ts`:
```ts
import { nextRunAfter } from './sync-backoff'

describe('nextRunAfter', () => {
  const base = new Date('2026-06-04T10:00:00.000Z')

  it('первая попытка — задержка ~30 c', () => {
    const d = nextRunAfter(1, base)
    expect(d.getTime() - base.getTime()).toBe(30_000)
  })

  it('задержка растёт экспоненциально', () => {
    expect(nextRunAfter(2, base).getTime() - base.getTime()).toBe(60_000)
    expect(nextRunAfter(3, base).getTime() - base.getTime()).toBe(120_000)
  })

  it('ограничена сверху 1 часом', () => {
    expect(nextRunAfter(99, base).getTime() - base.getTime()).toBe(3_600_000)
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npm test -w backend -- sync-backoff`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

Создать `apps/backend/src/modules/calendar/lib/sync-backoff.ts`:
```ts
const BASE_MS = 30_000
const MAX_MS = 3_600_000

/** Экспоненциальный бэкофф: 30s, 60s, 120s, … с потолком в 1 час. */
export function nextRunAfter(attempts: number, from: Date = new Date()): Date {
  const delay = Math.min(BASE_MS * 2 ** Math.max(0, attempts - 1), MAX_MS)
  return new Date(from.getTime() + delay)
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `npm test -w backend -- sync-backoff`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/calendar/lib/sync-backoff.ts apps/backend/src/modules/calendar/lib/sync-backoff.spec.ts
git commit -m "feat(backend): экспоненциальный бэкофф для аутбокс-воркера"
```

---

## Task 7: Сборка ресурса события (TDD)

**Files:**
- Create: `apps/backend/src/modules/calendar/lib/event-builder.ts`
- Test: `apps/backend/src/modules/calendar/lib/event-builder.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `apps/backend/src/modules/calendar/lib/event-builder.spec.ts`:
```ts
import { buildEventResource, computeEndTime } from './event-builder'

describe('computeEndTime', () => {
  it('прибавляет длительность к времени начала', () => {
    expect(computeEndTime('2026-06-04', '18:00', 90)).toEqual({
      date: '2026-06-04',
      time: '19:30',
    })
  })

  it('переносит дату при переходе через полночь', () => {
    expect(computeEndTime('2026-06-04', '23:30', 60)).toEqual({
      date: '2026-06-05',
      time: '00:30',
    })
  })
})

describe('buildEventResource', () => {
  it('групповая: заголовок = название группы, время в нужном поясе', () => {
    const ev = buildEventResource({
      eventId: 'abc',
      groupName: 'Трикинг',
      studentName: null,
      date: '2026-06-04',
      time: '18:00',
      durationMin: 60,
      locationName: 'Зал №1',
      locationAddress: 'ул. Спортивная, 1',
      note: 'разминка',
      isOnline: false,
      isPrime: true,
      trainingId: 'tid',
      timeZone: 'Europe/Moscow',
    })
    expect(ev.id).toBe('abc')
    expect(ev.summary).toBe('Трикинг')
    expect(ev.start).toEqual({ dateTime: '2026-06-04T18:00:00', timeZone: 'Europe/Moscow' })
    expect(ev.end).toEqual({ dateTime: '2026-06-04T19:00:00', timeZone: 'Europe/Moscow' })
    expect(ev.location).toContain('Зал №1')
    expect(ev.extendedProperties?.private?.trainingId).toBe('tid')
  })

  it('индивидуальная: заголовок = имя ученика; онлайн помечается в месте', () => {
    const ev = buildEventResource({
      eventId: 'abc',
      groupName: 'Индивидуальные',
      studentName: 'Иван Петров',
      date: '2026-06-04',
      time: '10:00',
      durationMin: 60,
      locationName: null,
      locationAddress: null,
      note: '',
      isOnline: true,
      isPrime: false,
      trainingId: 'tid',
      timeZone: 'Europe/Moscow',
    })
    expect(ev.summary).toBe('Иван Петров')
    expect(ev.location).toBe('Онлайн')
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npm test -w backend -- event-builder`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

Создать `apps/backend/src/modules/calendar/lib/event-builder.ts`:
```ts
export interface EventBuilderInput {
  eventId: string
  groupName: string | null
  studentName: string | null
  date: string // YYYY-MM-DD
  time: string // HH:mm
  durationMin: number
  locationName: string | null
  locationAddress: string | null
  note: string
  isOnline: boolean
  isPrime: boolean
  trainingId: string
  timeZone: string
}

export interface GoogleEventResource {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  extendedProperties?: { private?: Record<string, string> }
}

/** Конец занятия как настенное время (с переносом даты через полночь). */
export function computeEndTime(
  date: string,
  time: string,
  durationMin: number,
): { date: string; time: string } {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + durationMin
  const dayShift = Math.floor(total / (24 * 60))
  const minOfDay = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const hh = String(Math.floor(minOfDay / 60)).padStart(2, '0')
  const mm = String(minOfDay % 60).padStart(2, '0')
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dayShift)
  const endDate = d.toISOString().slice(0, 10)
  return { date: endDate, time: `${hh}:${mm}` }
}

export function buildEventResource(input: EventBuilderInput): GoogleEventResource {
  const summary = input.studentName ?? input.groupName ?? 'Тренировка'
  const end = computeEndTime(input.date, input.time, input.durationMin)

  const location = input.isOnline
    ? 'Онлайн'
    : [input.locationName, input.locationAddress].filter(Boolean).join(', ') || undefined

  const descParts: string[] = []
  if (input.note) descParts.push(input.note)
  if (input.isPrime) descParts.push('Прайм-тайм')

  return {
    id: input.eventId,
    summary,
    description: descParts.length ? descParts.join('\n') : undefined,
    location,
    start: { dateTime: `${input.date}T${input.time}:00`, timeZone: input.timeZone },
    end: { dateTime: `${end.date}T${end.time}:00`, timeZone: input.timeZone },
    extendedProperties: { private: { trainingId: input.trainingId } },
  }
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `npm test -w backend -- event-builder`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/calendar/lib/event-builder.ts apps/backend/src/modules/calendar/lib/event-builder.spec.ts
git commit -m "feat(backend): сборка ресурса события Google из тренировки"
```

---

## Task 8: Шифрование refresh-токена (TDD)

**Files:**
- Create: `apps/backend/src/modules/calendar/services/token-crypto.service.ts`
- Test: `apps/backend/src/modules/calendar/services/token-crypto.service.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `apps/backend/src/modules/calendar/services/token-crypto.service.spec.ts`:
```ts
import { TokenCryptoService } from './token-crypto.service'

describe('TokenCryptoService', () => {
  const svc = new TokenCryptoService('some-secret-key')

  it('расшифровывает зашифрованное (round-trip)', () => {
    const enc = svc.encrypt('refresh-token-123')
    expect(enc).not.toContain('refresh-token-123')
    expect(svc.decrypt(enc)).toBe('refresh-token-123')
  })

  it('каждый раз даёт разный шифротекст (случайный IV)', () => {
    expect(svc.encrypt('x')).not.toBe(svc.encrypt('x'))
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npm test -w backend -- token-crypto`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

Создать `apps/backend/src/modules/calendar/services/token-crypto.service.ts`:
```ts
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/** Шифрует/расшифровывает refresh-токены (AES-256-GCM). Ключ — из конфига. */
@Injectable()
export class TokenCryptoService {
  private readonly key: Buffer

  constructor(secret: string | ConfigService) {
    const raw =
      typeof secret === 'string' ? secret : secret.get<string>('calendarTokenEncKey') ?? ''
    // sha256 даёт стабильные 32 байта из ключа любой длины.
    this.key = createHash('sha256').update(raw).digest()
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.')
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, encB64] = payload.split('.')
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(encB64, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  }
}
```
Примечание: конструктор принимает строку (для юнит-теста) ИЛИ `ConfigService` (для DI). В модуле зарегистрируем как провайдер с `ConfigService`.

- [ ] **Step 4: Запустить — проходит**

Run: `npm test -w backend -- token-crypto`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/calendar/services/token-crypto.service.ts apps/backend/src/modules/calendar/services/token-crypto.service.spec.ts
git commit -m "feat(backend): шифрование refresh-токена (AES-256-GCM)"
```

---

## Task 9: Доступ к подключениям (CalendarConnectionService)

**Files:**
- Create: `apps/backend/src/modules/calendar/services/calendar-connection.service.ts`

- [ ] **Step 1: Реализация**

Создать `apps/backend/src/modules/calendar/services/calendar-connection.service.ts`:
```ts
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import type { ConnectionStatus } from '../calendar.constants'
import { CalendarConnection } from '../models/calendar-connection.model'
import { TokenCryptoService } from './token-crypto.service'

@Injectable()
export class CalendarConnectionService {
  constructor(
    @InjectModel(CalendarConnection)
    private readonly model: typeof CalendarConnection,
    private readonly crypto: TokenCryptoService,
  ) {}

  findByUser(userId: string): Promise<CalendarConnection | null> {
    return this.model.findOne({ where: { userId } })
  }

  /** Тренер «подключён», если есть refresh-токен, выбран календарь и статус connected. */
  async isActive(userId: string): Promise<boolean> {
    const c = await this.findByUser(userId)
    return !!c && c.status === 'connected' && !!c.calendarId && !!c.refreshTokenEnc
  }

  /** Сохранить refresh-токен после согласия (календарь ещё не выбран). */
  async saveTokens(userId: string, refreshToken: string): Promise<CalendarConnection> {
    const enc = this.crypto.encrypt(refreshToken)
    const existing = await this.findByUser(userId)
    if (existing) {
      existing.refreshTokenEnc = enc
      existing.status = 'connected'
      return existing.save()
    }
    return this.model.create({
      userId,
      provider: 'google',
      refreshTokenEnc: enc,
      status: 'connected',
    })
  }

  async setCalendar(userId: string, calendarId: string, timeZone: string): Promise<void> {
    await this.model.update(
      { calendarId, calendarTimeZone: timeZone },
      { where: { userId } },
    )
  }

  async setStatus(userId: string, status: ConnectionStatus): Promise<void> {
    await this.model.update({ status }, { where: { userId } })
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const c = await this.findByUser(userId)
    return c?.refreshTokenEnc ? this.crypto.decrypt(c.refreshTokenEnc) : null
  }

  async disconnect(userId: string): Promise<void> {
    await this.model.update(
      { status: 'disconnected', refreshTokenEnc: null },
      { where: { userId } },
    )
  }
}
```

- [ ] **Step 2: Сборка**

Run: `npx tsc -p apps/backend/tsconfig.json --noEmit`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/calendar/services/calendar-connection.service.ts
git commit -m "feat(backend): CalendarConnectionService — доступ к подключениям Google"
```

---

## Task 10: Обёртка над Google API (GoogleOAuthService)

**Files:**
- Create: `apps/backend/src/modules/calendar/services/google-oauth.service.ts`

- [ ] **Step 1: Реализация**

Создать `apps/backend/src/modules/calendar/services/google-oauth.service.ts`:
```ts
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { google, type calendar_v3 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

import { GOOGLE_CALENDAR_SCOPE } from '../calendar.constants'
import type { GoogleEventResource } from '../lib/event-builder'

export interface CalendarSummary {
  id: string
  name: string
  primary: boolean
  timeZone: string
}

/** Ошибка, которую воркер трактует как «токен мёртв → нужно переподключение». */
export class CalendarAuthError extends Error {}

@Injectable()
export class GoogleOAuthService {
  constructor(private readonly config: ConfigService) {}

  private base(): OAuth2Client {
    return new google.auth.OAuth2(
      this.config.get<string>('google.clientId'),
      this.config.get<string>('google.clientSecret'),
      this.config.get<string>('google.redirectUri'),
    )
  }

  /** URL согласия Google. `state` — подписанный идентификатор пользователя. */
  buildAuthUrl(state: string): string {
    return this.base().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [GOOGLE_CALENDAR_SCOPE],
      state,
    })
  }

  /** Обмен кода на refresh-токен. */
  async exchangeCode(code: string): Promise<string> {
    const { tokens } = await this.base().getToken(code)
    if (!tokens.refresh_token) {
      throw new Error('Google не вернул refresh_token (нужен prompt=consent / offline access)')
    }
    return tokens.refresh_token
  }

  private client(refreshToken: string): calendar_v3.Calendar {
    const auth = this.base()
    auth.setCredentials({ refresh_token: refreshToken })
    return google.calendar({ version: 'v3', auth })
  }

  async listCalendars(refreshToken: string): Promise<CalendarSummary[]> {
    const cal = this.client(refreshToken)
    const res = await this.wrapAuth(() => cal.calendarList.list({ maxResults: 250 }))
    return (res.data.items ?? []).map((c) => ({
      id: c.id ?? '',
      name: c.summary ?? c.id ?? '',
      primary: !!c.primary,
      timeZone: c.timeZone ?? 'Europe/Moscow',
    }))
  }

  /** Создать календарь, вернуть его id и пояс. */
  async createCalendar(
    refreshToken: string,
    name: string,
    timeZone: string,
  ): Promise<{ id: string; timeZone: string }> {
    const cal = this.client(refreshToken)
    const res = await this.wrapAuth(() =>
      cal.calendars.insert({ requestBody: { summary: name, timeZone } }),
    )
    return { id: res.data.id ?? '', timeZone: res.data.timeZone ?? timeZone }
  }

  /** Пояс основного календаря тренера (для выбора по умолчанию). */
  async primaryTimeZone(refreshToken: string): Promise<string> {
    const list = await this.listCalendars(refreshToken)
    return list.find((c) => c.primary)?.timeZone ?? 'Europe/Moscow'
  }

  /** Idempotent upsert: insert, при 409 — patch. */
  async upsertEvent(
    refreshToken: string,
    calendarId: string,
    event: GoogleEventResource,
  ): Promise<void> {
    const cal = this.client(refreshToken)
    try {
      await this.wrapAuth(() =>
        cal.events.insert({ calendarId, requestBody: event }),
      )
    } catch (e) {
      if (statusOf(e) === 409) {
        await this.wrapAuth(() =>
          cal.events.patch({ calendarId, eventId: event.id, requestBody: event }),
        )
        return
      }
      throw e
    }
  }

  /** Idempotent delete: 404/410 трактуем как успех. */
  async deleteEvent(refreshToken: string, calendarId: string, eventId: string): Promise<void> {
    const cal = this.client(refreshToken)
    try {
      await this.wrapAuth(() => cal.events.delete({ calendarId, eventId }))
    } catch (e) {
      const s = statusOf(e)
      if (s === 404 || s === 410) return
      throw e
    }
  }

  /** Преобразует 401/403/invalid_grant в CalendarAuthError. */
  private async wrapAuth<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (e) {
      const s = statusOf(e)
      const msg = String((e as { message?: string })?.message ?? '')
      if (s === 401 || s === 403 || msg.includes('invalid_grant')) {
        throw new CalendarAuthError(msg || 'Доступ к Google отозван')
      }
      throw e
    }
  }
}

function statusOf(e: unknown): number | undefined {
  const err = e as { code?: number; status?: number; response?: { status?: number } }
  return err?.response?.status ?? err?.status ?? err?.code
}
```

- [ ] **Step 2: Сборка**

Run: `npx tsc -p apps/backend/tsconfig.json --noEmit`
Expected: без ошибок (типы `googleapis` подтянулись).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/calendar/services/google-oauth.service.ts
git commit -m "feat(backend): GoogleOAuthService — обёртка над Google Calendar API"
```

---

## Task 11: Постановка задач в аутбокс (CalendarSyncService)

**Files:**
- Create: `apps/backend/src/modules/calendar/services/calendar-sync.service.ts`

- [ ] **Step 1: Реализация**

Создать `apps/backend/src/modules/calendar/services/calendar-sync.service.ts`:
```ts
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'

import { Training } from '../../training/training.model'
import { TrainingService } from '../../training/training.service'
import type { SyncOperation } from '../calendar.constants'
import { CalendarSyncTask } from '../models/calendar-sync-task.model'
import { CalendarConnectionService } from './calendar-connection.service'

@Injectable()
export class CalendarSyncService {
  constructor(
    @InjectModel(CalendarSyncTask) private readonly taskModel: typeof CalendarSyncTask,
    @InjectModel(Training) private readonly trainingModel: typeof Training,
    private readonly connections: CalendarConnectionService,
  ) {}

  /**
   * Поставить upsert тренировки. Без времени → ставим delete (убрать возможное
   * устаревшее событие). No-op, если у тренера нет активного подключения.
   */
  async enqueueUpsert(userId: string, trainingId: string, time: string): Promise<void> {
    if (!time) {
      await this.enqueueDelete(userId, trainingId)
      return
    }
    await this.enqueue(userId, trainingId, 'upsert')
  }

  async enqueueDelete(userId: string, trainingId: string): Promise<void> {
    await this.enqueue(userId, trainingId, 'delete')
  }

  /** Бэкфилл: все будущие тренировки тренера со временем → upsert. */
  async backfill(userId: string): Promise<number> {
    if (!(await this.connections.isActive(userId))) return 0
    const today = TrainingService.today()
    const trainings = await this.trainingModel.findAll({
      where: { userId, date: { [Op.gte]: today }, time: { [Op.ne]: '' } },
    })
    for (const t of trainings) await this.enqueue(userId, t.id, 'upsert')
    return trainings.length
  }

  private async enqueue(userId: string, trainingId: string, operation: SyncOperation): Promise<void> {
    const conn = await this.connections.findByUser(userId)
    if (!conn || conn.status === 'disconnected' || !conn.calendarId) return
    // Схлопываем незавершённые задачи по этой тренировке — оставляем одну свежую.
    await this.taskModel.destroy({ where: { trainingId, status: 'pending' } })
    await this.taskModel.create({
      userId,
      trainingId,
      operation,
      calendarId: conn.calendarId,
      status: 'pending',
      attempts: 0,
      runAfter: new Date(),
    })
  }
}
```

- [ ] **Step 2: Сборка**

Run: `npx tsc -p apps/backend/tsconfig.json --noEmit`
Expected: без ошибок. (Импорт `TrainingService`/`Training` создаёт зависимость от модели тренировок — её зарегистрируем в модуле в Task 13.)

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/calendar/services/calendar-sync.service.ts
git commit -m "feat(backend): CalendarSyncService — постановка задач в аутбокс + бэкфилл"
```

---

## Task 12: Фоновый воркер (CalendarSyncWorker)

**Files:**
- Create: `apps/backend/src/modules/calendar/services/calendar-sync.worker.ts`

- [ ] **Step 1: Реализация**

Создать `apps/backend/src/modules/calendar/services/calendar-sync.worker.ts`:
```ts
import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Interval } from '@nestjs/schedule'
import { Op } from 'sequelize'

import { Group } from '../../group/group.model'
import { Location } from '../../location/location.model'
import { Student } from '../../student/student.model'
import { Training } from '../../training/training.model'
import { SYNC_BATCH, SYNC_INTERVAL_MS, SYNC_MAX_ATTEMPTS } from '../calendar.constants'
import { buildEventResource } from '../lib/event-builder'
import { eventIdFor } from '../lib/event-id'
import { nextRunAfter } from '../lib/sync-backoff'
import { CalendarSyncTask } from '../models/calendar-sync-task.model'
import { CalendarConnectionService } from './calendar-connection.service'
import { CalendarAuthError, GoogleOAuthService } from './google-oauth.service'

@Injectable()
export class CalendarSyncWorker {
  private readonly logger = new Logger(CalendarSyncWorker.name)
  private running = false

  constructor(
    @InjectModel(CalendarSyncTask) private readonly taskModel: typeof CalendarSyncTask,
    @InjectModel(Training) private readonly trainingModel: typeof Training,
    @InjectModel(Group) private readonly groupModel: typeof Group,
    @InjectModel(Location) private readonly locationModel: typeof Location,
    @InjectModel(Student) private readonly studentModel: typeof Student,
    private readonly connections: CalendarConnectionService,
    private readonly google: GoogleOAuthService,
  ) {}

  @Interval(SYNC_INTERVAL_MS)
  async tick(): Promise<void> {
    if (this.running) return // не накладываем проходы друг на друга
    this.running = true
    try {
      const tasks = await this.taskModel.findAll({
        where: { status: 'pending', runAfter: { [Op.lte]: new Date() } },
        order: [['createdAt', 'ASC']],
        limit: SYNC_BATCH,
      })
      for (const task of tasks) await this.process(task)
    } catch (e) {
      this.logger.error(`Сбой прохода воркера: ${String(e)}`)
    } finally {
      this.running = false
    }
  }

  private async process(task: CalendarSyncTask): Promise<void> {
    const refreshToken = await this.connections.getRefreshToken(task.userId)
    const conn = await this.connections.findByUser(task.userId)
    if (!refreshToken || !conn || conn.status !== 'connected' || !task.calendarId) {
      // Подключения нет/отключено — задача неактуальна.
      task.status = 'done'
      await task.save()
      return
    }

    try {
      if (task.operation === 'delete') {
        await this.google.deleteEvent(refreshToken, task.calendarId, eventIdFor(task.trainingId))
      } else {
        const event = await this.buildEvent(task)
        if (!event) {
          // Тренировка исчезла — нечего синхронизировать.
          task.status = 'done'
          await task.save()
          return
        }
        await this.google.upsertEvent(refreshToken, task.calendarId, event)
      }
      task.status = 'done'
      task.lastError = null
      await task.save()
    } catch (e) {
      if (e instanceof CalendarAuthError) {
        await this.connections.setStatus(task.userId, 'needs_reconnect')
        task.lastError = e.message
        task.runAfter = nextRunAfter(SYNC_MAX_ATTEMPTS) // подождать до переподключения
        await task.save()
        return
      }
      task.attempts += 1
      task.lastError = String((e as { message?: string })?.message ?? e)
      if (task.attempts >= SYNC_MAX_ATTEMPTS) {
        task.status = 'failed'
      } else {
        task.runAfter = nextRunAfter(task.attempts)
      }
      await task.save()
    }
  }

  private async buildEvent(task: CalendarSyncTask) {
    const training = await this.trainingModel.findByPk(task.trainingId, { include: [Student] })
    if (!training || !training.time) return null

    const group = await this.groupModel.findByPk(training.groupId)
    const location = training.locationId
      ? await this.locationModel.findByPk(training.locationId)
      : null

    let studentName: string | null = null
    if (training.plannedStudentId) {
      const s = await this.studentModel.findByPk(training.plannedStudentId)
      studentName = s?.name ?? null
    }

    const conn = await this.connections.findByUser(task.userId)
    return buildEventResource({
      eventId: eventIdFor(training.id),
      groupName: group?.name ?? null,
      studentName,
      date: training.date,
      time: training.time,
      durationMin: training.sessionDuration,
      locationName: location?.name ?? null,
      locationAddress: location?.address ?? null,
      note: training.note,
      isOnline: training.isOnline,
      isPrime: training.isPrime,
      trainingId: training.id,
      timeZone: conn?.calendarTimeZone ?? 'Europe/Moscow',
    })
  }
}
```

- [ ] **Step 2: Сборка**

Run: `npx tsc -p apps/backend/tsconfig.json --noEmit`
Expected: без ошибок. (Проверь, что у `Student` есть поле `name`, у `Group` — `name`, у `Location` — `name`/`address`; они существуют по моделям.)

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/calendar/services/calendar-sync.worker.ts
git commit -m "feat(backend): фоновый воркер синхронизации с автоповторами"
```

---

## Task 13: Сборка модуля + регистрация в приложении

**Files:**
- Create: `apps/backend/src/modules/calendar/calendar.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: `CalendarModule`**

Создать `apps/backend/src/modules/calendar/calendar.module.ts`:
```ts
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { SequelizeModule } from '@nestjs/sequelize'

import { Group } from '../group/group.model'
import { Location } from '../location/location.model'
import { Student } from '../student/student.model'
import { Training } from '../training/training.model'
import { CalendarController } from './calendar.controller'
import { CalendarConnection } from './models/calendar-connection.model'
import { CalendarSyncTask } from './models/calendar-sync-task.model'
import { CalendarConnectionService } from './services/calendar-connection.service'
import { CalendarSyncService } from './services/calendar-sync.service'
import { CalendarSyncWorker } from './services/calendar-sync.worker'
import { GoogleOAuthService } from './services/google-oauth.service'
import { TokenCryptoService } from './services/token-crypto.service'

@Module({
  imports: [
    SequelizeModule.forFeature([
      CalendarConnection,
      CalendarSyncTask,
      Training,
      Group,
      Location,
      Student,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.get<string>('jwt.secret'),
        signOptions: { expiresIn: '10m' },
      }),
    }),
  ],
  controllers: [CalendarController],
  providers: [
    { provide: TokenCryptoService, useFactory: (c: ConfigService) => new TokenCryptoService(c), inject: [ConfigService] },
    CalendarConnectionService,
    GoogleOAuthService,
    CalendarSyncService,
    CalendarSyncWorker,
  ],
  exports: [CalendarSyncService],
})
export class CalendarModule {}
```

- [ ] **Step 2: Зарегистрировать `ScheduleModule` и `CalendarModule` в `app.module.ts`**

В `apps/backend/src/app.module.ts`:
- добавить импорты сверху:
```ts
import { ScheduleModule } from '@nestjs/schedule'
import { CalendarModule } from './modules/calendar/calendar.module'
```
- в массив `imports` (после `ConfigModule.forRoot({...})` добавить `ScheduleModule.forRoot()`, и в конец списка модулей — `CalendarModule`):
```ts
    ScheduleModule.forRoot(),
    // ... существующие модули ...
    CalendarModule,
```

- [ ] **Step 3: Сборка**

Run: `npx tsc -p apps/backend/tsconfig.json --noEmit`
Expected: ошибка про отсутствующий `./calendar.controller` — это ожидаемо, контроллер создаём в Task 14. Если других ошибок нет — порядок. (Контроллер добавим следующим, затем пересоберём.)

- [ ] **Step 4: Commit (без контроллера пока не коммитим — см. Task 14)**

Пропустить коммит до Task 14, где добавится контроллер и сборка станет зелёной.

---

## Task 14: Контроллер (OAuth + управление)

**Files:**
- Create: `apps/backend/src/modules/calendar/dto/select-calendar.dto.ts`
- Create: `apps/backend/src/modules/calendar/calendar.controller.ts`

- [ ] **Step 1: DTO выбора календаря**

Создать `apps/backend/src/modules/calendar/dto/select-calendar.dto.ts`:
```ts
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class SelectCalendarDto {
  @IsOptional()
  @IsString()
  calendarId?: string

  @IsOptional()
  @IsBoolean()
  create?: boolean

  @IsOptional()
  @IsString()
  name?: string
}
```

- [ ] **Step 2: Контроллер**

Создать `apps/backend/src/modules/calendar/calendar.controller.ts`:
```ts
import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { FastifyReply } from 'fastify'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface'
import { SelectCalendarDto } from './dto/select-calendar.dto'
import { CalendarConnectionService } from './services/calendar-connection.service'
import { CalendarSyncService } from './services/calendar-sync.service'
import { GoogleOAuthService } from './services/google-oauth.service'

@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly google: GoogleOAuthService,
    private readonly connections: CalendarConnectionService,
    private readonly sync: CalendarSyncService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Состояние подключения для экрана настроек. */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@CurrentUser() user: CurrentUserPayload) {
    const c = await this.connections.findByUser(user.id)
    return {
      status: c?.status ?? 'disconnected',
      calendarId: c?.calendarId ?? null,
      calendarTimeZone: c?.calendarTimeZone ?? null,
    }
  }

  /** URL согласия Google (state = подписанный userId). */
  @Get('google/auth-url')
  @UseGuards(JwtAuthGuard)
  authUrl(@CurrentUser() user: CurrentUserPayload) {
    const state = this.jwt.sign({ sub: user.id })
    return { url: this.google.buildAuthUrl(state) }
  }

  /** Публичный редирект-приёмник от Google (без JWT — пользователь в state). */
  @Get('google/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const front = this.config.get<string>('frontendUrl') ?? 'http://localhost:3020'
    try {
      const { sub } = this.jwt.verify<{ sub: string }>(state)
      const refreshToken = await this.google.exchangeCode(code)
      await this.connections.saveTokens(sub, refreshToken)
      reply.redirect(`${front}/settings?google=connected`)
    } catch {
      reply.redirect(`${front}/settings?google=error`)
    }
  }

  /** Список календарей тренера для пикера. */
  @Get('calendars')
  @UseGuards(JwtAuthGuard)
  async calendars(@CurrentUser() user: CurrentUserPayload) {
    const token = await this.connections.getRefreshToken(user.id)
    if (!token) return { calendars: [] }
    return { calendars: await this.google.listCalendars(token) }
  }

  /** Выбрать существующий или создать новый календарь, затем бэкфилл. */
  @Post('select')
  @UseGuards(JwtAuthGuard)
  async select(@CurrentUser() user: CurrentUserPayload, @Body() dto: SelectCalendarDto) {
    const token = await this.connections.getRefreshToken(user.id)
    if (!token) return { ok: false }

    let calendarId = dto.calendarId ?? ''
    let timeZone = await this.google.primaryTimeZone(token)
    if (dto.create) {
      const created = await this.google.createCalendar(token, dto.name || 'TriKick', timeZone)
      calendarId = created.id
      timeZone = created.timeZone
    } else {
      const list = await this.google.listCalendars(token)
      timeZone = list.find((c) => c.id === calendarId)?.timeZone ?? timeZone
    }

    await this.connections.setCalendar(user.id, calendarId, timeZone)
    const count = await this.sync.backfill(user.id)
    return { ok: true, calendarId, backfilled: count }
  }

  /** Поставить в очередь повторную выгрузку всего расписания. */
  @Post('resync')
  @UseGuards(JwtAuthGuard)
  async resync(@CurrentUser() user: CurrentUserPayload) {
    return { backfilled: await this.sync.backfill(user.id) }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@CurrentUser() user: CurrentUserPayload) {
    await this.connections.disconnect(user.id)
    return { ok: true }
  }
}
```

- [ ] **Step 3: Сборка всего бэкенда**

Run: `npx tsc -p apps/backend/tsconfig.json --noEmit`
Expected: без ошибок (модуль из Task 13 теперь находит контроллер).

- [ ] **Step 4: Запуск приложения — проверка, что поднимается**

Run: `npm run start:dev -w backend` (подожди строку `TriKick API запущен …`, затем останови Ctrl+C).
Expected: старт без ошибок DI; в логах нет падений; маршруты `/api/calendar/*` зарегистрированы.

- [ ] **Step 5: Commit (модуль + контроллер вместе)**

```bash
git add apps/backend/src/modules/calendar/calendar.module.ts apps/backend/src/modules/calendar/calendar.controller.ts apps/backend/src/modules/calendar/dto apps/backend/src/app.module.ts
git commit -m "feat(backend): CalendarModule, контроллер OAuth и управление подключением"
```

---

## Task 15: Врезки в тренировки (enqueue при мутациях)

**Files:**
- Modify: `apps/backend/src/modules/training/training.module.ts`
- Modify: `apps/backend/src/modules/training/training.service.ts`

- [ ] **Step 1: Импортировать `CalendarModule` в `training.module.ts`**

В `apps/backend/src/modules/training/training.module.ts` добавить импорт и в `imports`:
```ts
import { CalendarModule } from '../calendar/calendar.module'
// ...
  imports: [
    SequelizeModule.forFeature([Training, TrainingAttendee]),
    StudentModule,
    LocationModule,
    CalendarModule,
  ],
```
(`CalendarModule` экспортирует `CalendarSyncService`. Циклов нет: `CalendarModule` не импортирует `TrainingModule`, а работает с моделью `Training` через `forFeature`.)

- [ ] **Step 2: Внедрить `CalendarSyncService` в `TrainingService`**

В `apps/backend/src/modules/training/training.service.ts`:
- импорт: `import { CalendarSyncService } from '../calendar/services/calendar-sync.service'`
- в конструктор добавить параметр (после `locationService`):
```ts
    private readonly calendarSync: CalendarSyncService,
```

- [ ] **Step 3: enqueue в `createTraining`**

В `createTraining`, заменить финал `return this.findOneForUser(userId, training.id)` на:
```ts
    await this.calendarSync.enqueueUpsert(userId, training.id, training.time)
    return this.findOneForUser(userId, training.id)
```

- [ ] **Step 4: Переопределить `updateForUser` (хук обновления)**

Добавить в класс метод (рядом с другими):
```ts
  /** Обновление + постановка синхронизации события. */
  async updateForUser(userId: string, id: string, data: object): Promise<Training> {
    const training = await super.updateForUser(userId, id, data)
    await this.calendarSync.enqueueUpsert(userId, training.id, training.time)
    return training
  }
```

- [ ] **Step 5: enqueue в `markAttendance` и `removeAttendee` (обновить заголовок/статус)**

В конце `markAttendance` (после цикла) добавить:
```ts
    await this.calendarSync.enqueueUpsert(training.userId, training.id, training.time)
```
В конце `removeAttendee` (после восстановления) добавить:
```ts
    await this.calendarSync.enqueueUpsert(training.userId, training.id, training.time)
```

- [ ] **Step 6: enqueue delete в `removeTraining` и `removeSeries`**

В `removeTraining`, перед `await training.destroy()` добавить:
```ts
    await this.calendarSync.enqueueDelete(userId, training.id)
```
В `removeSeries`, внутри цикла перед `await t.destroy()` добавить:
```ts
      await this.calendarSync.enqueueDelete(userId, t.id)
```

- [ ] **Step 7: Сборка**

Run: `npx tsc -p apps/backend/tsconfig.json --noEmit`
Expected: без ошибок.

- [ ] **Step 8: Прогнать все юнит-тесты**

Run: `npm test -w backend`
Expected: PASS — все спеки (event-id, sync-backoff, event-builder, token-crypto).

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/training/training.module.ts apps/backend/src/modules/training/training.service.ts
git commit -m "feat(backend): постановка синхронизации Google при мутациях тренировок"
```

---

## Task 16: Frontend — репозиторий вызовов API

**Files:**
- Create: `apps/frontend/src/entities/calendar/calendar.repo.ts`

- [ ] **Step 1: Реализация**

Создать `apps/frontend/src/entities/calendar/calendar.repo.ts`:
```ts
import { apiClient } from 'common/services/api/api-client'

export type CalendarStatus = 'disconnected' | 'connected' | 'needs_reconnect'

export interface CalendarConnectionState {
  status: CalendarStatus
  calendarId: string | null
  calendarTimeZone: string | null
}

export interface CalendarOption {
  id: string
  name: string
  primary: boolean
  timeZone: string
}

export const calendarRepo = {
  getStatus: (): Promise<CalendarConnectionState> =>
    apiClient.get<CalendarConnectionState>('/calendar/status'),

  getAuthUrl: (): Promise<{ url: string }> =>
    apiClient.get<{ url: string }>('/calendar/google/auth-url'),

  listCalendars: (): Promise<{ calendars: CalendarOption[] }> =>
    apiClient.get<{ calendars: CalendarOption[] }>('/calendar/calendars'),

  select: (body: { calendarId?: string; create?: boolean; name?: string }): Promise<unknown> =>
    apiClient.post('/calendar/select', body),

  resync: (): Promise<{ backfilled: number }> =>
    apiClient.post<{ backfilled: number }>('/calendar/resync'),

  disconnect: (): Promise<unknown> => apiClient.post('/calendar/disconnect'),
}
```

- [ ] **Step 2: Сборка фронта**

Run: `npx tsc -p apps/frontend/tsconfig.json --noEmit`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/entities/calendar/calendar.repo.ts
git commit -m "feat(frontend): репозиторий API синхронизации с Google Календарём"
```

---

## Task 17: Frontend — карточка подключения Google

**Files:**
- Create: `apps/frontend/src/pages/settings/google-calendar-card.tsx`

- [ ] **Step 1: Реализация компонента**

Создать `apps/frontend/src/pages/settings/google-calendar-card.tsx`:
```tsx
import { Alert, Button, Card, List, Modal, Space, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  calendarRepo,
  type CalendarConnectionState,
  type CalendarOption,
} from 'entities/calendar/calendar.repo'

export function GoogleCalendarCard() {
  const { t } = useTranslation()
  const [state, setState] = useState<CalendarConnectionState | null>(null)
  const [picker, setPicker] = useState<CalendarOption[] | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = () => calendarRepo.getStatus().then(setState).catch(() => undefined)

  useEffect(() => {
    void refresh()
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      void openPicker()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('google') === 'error') {
      message.error(t('settings.google.error'))
      window.history.replaceState({}, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = async () => {
    const { url } = await calendarRepo.getAuthUrl()
    window.location.href = url
  }

  const openPicker = async () => {
    const { calendars } = await calendarRepo.listCalendars()
    setPicker(calendars)
  }

  const choose = async (body: { calendarId?: string; create?: boolean; name?: string }) => {
    setBusy(true)
    try {
      await calendarRepo.select(body)
      setPicker(null)
      await refresh()
      message.success(t('settings.google.selected'))
    } finally {
      setBusy(false)
    }
  }

  const resync = async () => {
    const { backfilled } = await calendarRepo.resync()
    message.success(t('settings.google.resynced', { count: backfilled }))
  }

  const disconnect = async () => {
    await calendarRepo.disconnect()
    await refresh()
  }

  const status = state?.status ?? 'disconnected'

  return (
    <Card title={t('settings.google.title')}>
      {status === 'needs_reconnect' && (
        <Alert type="warning" showIcon message={t('settings.google.needsReconnect')} style={{ marginBottom: 12 }} />
      )}

      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text type="secondary">{t('settings.google.hint')}</Typography.Text>

        {status === 'connected' && state?.calendarId ? (
          <>
            <Tag color="green">{t('settings.google.connectedTo', { name: state.calendarId })}</Tag>
            <Space>
              <Button onClick={resync}>{t('settings.google.resync')}</Button>
              <Button onClick={openPicker}>{t('settings.google.changeCalendar')}</Button>
              <Button danger onClick={disconnect}>{t('settings.google.disconnect')}</Button>
            </Space>
          </>
        ) : status === 'connected' && !state?.calendarId ? (
          <Button type="primary" onClick={openPicker}>{t('settings.google.chooseCalendar')}</Button>
        ) : (
          <Button type="primary" onClick={connect}>{t('settings.google.connect')}</Button>
        )}
      </Space>

      <Modal
        open={!!picker}
        title={t('settings.google.pickerTitle')}
        footer={null}
        onCancel={() => setPicker(null)}
      >
        <Button
          block
          type="dashed"
          loading={busy}
          style={{ marginBottom: 12 }}
          onClick={() => choose({ create: true, name: 'TriKick' })}
        >
          ➕ {t('settings.google.createNew')}
        </Button>
        <List
          dataSource={picker ?? []}
          renderItem={(c) => (
            <List.Item
              actions={[
                <Button key="s" size="small" loading={busy} onClick={() => choose({ calendarId: c.id })}>
                  {t('settings.google.choose')}
                </Button>,
              ]}
            >
              {c.name} {c.primary && <Tag>{t('settings.google.primary')}</Tag>}
            </List.Item>
          )}
        />
      </Modal>
    </Card>
  )
}
```

- [ ] **Step 2: Сборка фронта**

Run: `npx tsc -p apps/frontend/tsconfig.json --noEmit`
Expected: ошибки об отсутствующих ключах i18n НЕ возникают (ключи резолвятся в рантайме); TS-ошибок нет. (Если есть ошибка про путь импорта `entities/calendar/...` — проверь алиасы в `tsconfig`/`vite`, они уже настроены для `entities/*`.)

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/settings/google-calendar-card.tsx
git commit -m "feat(frontend): карточка подключения Google Календаря"
```

---

## Task 18: Frontend — страница настроек, маршрут и пункт меню

**Files:**
- Create: `apps/frontend/src/pages/settings/settings-page.tsx`
- Create: `apps/frontend/src/pages/settings/index.ts`
- Modify: `apps/frontend/src/app/routes.tsx`
- Modify: `apps/frontend/src/app/layout/sidebar.tsx`

- [ ] **Step 1: Страница настроек**

Создать `apps/frontend/src/pages/settings/settings-page.tsx`:
```tsx
import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'

import { GoogleCalendarCard } from './google-calendar-card'

export function SettingsPage() {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
      <Typography.Title level={3}>{t('settings.title')}</Typography.Title>
      <GoogleCalendarCard />
    </div>
  )
}
```

Создать `apps/frontend/src/pages/settings/index.ts`:
```ts
export { SettingsPage } from './settings-page'
```

- [ ] **Step 2: Маршрут `/settings`**

В `apps/frontend/src/app/routes.tsx`:
- добавить импорт рядом с другими страницами:
```ts
import { SettingsPage } from 'pages/settings'
```
- внутри защищённого layout-роута (там, где `home`, `finance` и т.п.) добавить:
```tsx
        <Route path="settings" element={<SettingsPage />} />
```
(Проверь, как именно объявлены соседние роуты — повтори их синтаксис: либо `<Route element>`, либо объект конфигурации. Для объектного варианта: `{ path: 'settings', element: <SettingsPage /> }`.)

- [ ] **Step 3: Пункт «Настройки» в сайдбаре**

В `apps/frontend/src/app/layout/sidebar.tsx` добавить ссылку на `/settings` рядом с существующими (например, около кнопки выхода). Минимально — `NavLink`/`Menu.Item` с иконкой шестерёнки:
```tsx
import { SettingOutlined } from '@ant-design/icons'
// ... в списке пунктов меню:
//   <NavLink to="/settings"><SettingOutlined /> {t('nav.settings')}</NavLink>
```
(Точную разметку повтори по образцу соседних пунктов в этом файле — структура там уже задана.)

- [ ] **Step 4: Сборка фронта**

Run: `npx tsc -p apps/frontend/tsconfig.json --noEmit`
Expected: без ошибок.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/settings apps/frontend/src/app/routes.tsx apps/frontend/src/app/layout/sidebar.tsx
git commit -m "feat(frontend): страница настроек, маршрут /settings и пункт меню"
```

---

## Task 19: Frontend — строки локализации (ru + en)

**Files:**
- Modify: `apps/frontend/src/locales/ru/translation.json`
- Modify: `apps/frontend/src/locales/en/translation.json`

- [ ] **Step 1: Добавить ключи в `ru/translation.json`**

В корневой объект добавить (и ключ `nav.settings` — в существующий блок `nav`):
```jsonc
"nav": { /* ...существующее... */ "settings": "Настройки" },
"settings": {
  "title": "Настройки",
  "google": {
    "title": "Google Календарь",
    "hint": "Тренировки автоматически попадают в выбранный календарь Google.",
    "connect": "Подключить Google",
    "chooseCalendar": "Выбрать календарь",
    "changeCalendar": "Сменить календарь",
    "connectedTo": "Подключено: {{name}}",
    "pickerTitle": "Куда складывать тренировки",
    "createNew": "Создать новый «TriKick»",
    "choose": "Выбрать",
    "primary": "Основной",
    "selected": "Календарь выбран, расписание выгружается",
    "resync": "Синхронизировать всё",
    "resynced": "Поставлено в очередь: {{count}}",
    "disconnect": "Отключить",
    "needsReconnect": "Доступ к Google истёк — переподключите календарь.",
    "error": "Не удалось подключить Google. Попробуйте ещё раз."
  }
}
```
(Если `nav` уже существует — добавь только `"settings"` внутрь него, не дублируя блок.)

- [ ] **Step 2: Добавить те же ключи в `en/translation.json`**

```jsonc
"nav": { /* ...existing... */ "settings": "Settings" },
"settings": {
  "title": "Settings",
  "google": {
    "title": "Google Calendar",
    "hint": "Trainings are pushed to your selected Google calendar automatically.",
    "connect": "Connect Google",
    "chooseCalendar": "Choose calendar",
    "changeCalendar": "Change calendar",
    "connectedTo": "Connected: {{name}}",
    "pickerTitle": "Where to put trainings",
    "createNew": "Create new \"TriKick\"",
    "choose": "Choose",
    "primary": "Primary",
    "selected": "Calendar selected, schedule is being exported",
    "resync": "Sync everything",
    "resynced": "Queued: {{count}}",
    "disconnect": "Disconnect",
    "needsReconnect": "Google access expired — reconnect the calendar.",
    "error": "Could not connect Google. Please try again."
  }
}
```

- [ ] **Step 3: Проверить валидность JSON и сборку**

Run: `node -e "require('./apps/frontend/src/locales/ru/translation.json');require('./apps/frontend/src/locales/en/translation.json');console.log('JSON OK')"`
Expected: `JSON OK`.
Run: `npx tsc -p apps/frontend/tsconfig.json --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/locales/ru/translation.json apps/frontend/src/locales/en/translation.json
git commit -m "feat(frontend): локализация раздела настроек и Google-календаря"
```

---

## Task 20: Настройка Google Cloud (действие пользователя) + .env

**Files:**
- Modify: `apps/backend/.env` (локально, не коммитим секреты)
- Modify: `apps/backend/.env.example` (если существует — добавить плейсхолдеры)

- [ ] **Step 1: Создать OAuth-клиент в Google Cloud (инструкция пользователю)**

Выдать пользователю шаги (он делает руками в браузере):
1. https://console.cloud.google.com → создать проект (или выбрать существующий).
2. APIs & Services → Library → включить **Google Calendar API**.
3. APIs & Services → OAuth consent screen → тип **External**; заполнить название/почту; добавить scope `.../auth/calendar`; добавить себя в **Test users**.
4. APIs & Services → Credentials → Create Credentials → **OAuth client ID** → тип **Web application**.
5. Authorized redirect URI: `http://localhost:3021/api/calendar/google/callback` (для прод — заменить на боевой адрес).
6. Скопировать **Client ID** и **Client secret**.

- [ ] **Step 2: Прописать переменные в `apps/backend/.env`**

```dotenv
GOOGLE_OAUTH_CLIENT_ID=<client id>
GOOGLE_OAUTH_CLIENT_SECRET=<client secret>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3021/api/calendar/google/callback
CALENDAR_TOKEN_ENC_KEY=<любая длинная случайная строка>
```
Сгенерировать ключ можно: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

- [ ] **Step 3: (если есть) обновить `.env.example`**

Добавить те же ключи с пустыми/плейсхолдерными значениями. Закоммитить только `.env.example`, не `.env`.

```bash
git add apps/backend/.env.example 2>/dev/null || true
git commit -m "docs(backend): переменные окружения для Google Calendar в .env.example" || echo "нет .env.example — пропустить"
```

---

## Task 21: Ручная сквозная проверка + финальная сборка

**Files:** —

- [ ] **Step 1: Поднять бэкенд и фронт**

Run (в двух терминалах):
```bash
npm run start:dev -w backend
npm run dev -w frontend
```
Expected: бэкенд на :3021, фронт на :3020 без ошибок.

- [ ] **Step 2: Подключение Google**

В UI: Настройки → «Подключить Google» → пройти согласие → вернуться на `/settings?google=connected` → открылся пикер календарей.
Expected: виден список календарей + кнопка «Создать новый „TriKick"».

- [ ] **Step 3: Создать календарь и проверить бэкфилл**

Нажать «Создать новый „TriKick"».
Expected: статус стал «Подключено», в логах бэкенда воркер обработал задачи; в Google Календаре («TriKick») появились будущие тренировки с верным временем/поясом/местом.

- [ ] **Step 4: CRUD события**

- Создать новую тренировку со временем → через ~20 c появилось событие.
- Изменить время/локацию → событие обновилось.
- Удалить тренировку → событие исчезло.
- Создать тренировку **без времени** → события нет (и не появляется).
Expected: всё соответствует.

- [ ] **Step 5: Сценарий «нужно переподключить»**

В Google Account → Security → сторонние приложения → отозвать доступ TriKick. Затем создать/изменить тренировку.
Expected: в течение нескольких проходов воркера статус подключения в настройках → «нужно переподключить», показан баннер; тренировки в системе сохраняются нормально.

- [ ] **Step 6: Финальные сборки и линт**

Run:
```bash
npx tsc -p apps/backend/tsconfig.json --noEmit
npx tsc -p apps/frontend/tsconfig.json --noEmit
npm test -w backend
npm run lint 2>/dev/null || echo "если есть отдельный lint — прогнать его"
```
Expected: всё зелёное; тесты проходят.

- [ ] **Step 7: Commit (если остались несохранённые мелочи) и пуш ветки**

```bash
git add -A
git commit -m "chore: финальные правки синхронизации Google Calendar" || echo "нечего коммитить"
git push -u origin feat/google-calendar-sync
```

---

## Самопроверка плана (для автора)

**Покрытие спеки:**
- §2 решения — Task 9/10/13/14 (per-user OAuth, выбор/создание календаря, пояс из аккаунта), Task 7 (одно событие на занятие), Task 11/12 (аутбокс+воркер), Task 15 (всё расписание через врезки). ✔
- §5 данные — Task 2 (миграции), Task 3 (модели); §5.1 детерминированный id — Task 5. ✔
- §6 OAuth — Task 10/14. ✔
- §7 содержимое события — Task 7. ✔
- §8 точки врезки/идемпотентность — Task 15 + Task 10 (insert→patch, delete 404/410). ✔
- §9 надёжность (бэкофф, needs_reconnect, бэкфилл, без времени) — Task 6/11/12. ✔
- §10 зависимости/env — Task 1/4/20. ✔
- §11 тесты — Task 5/6/7/8 (юнит) + Task 21 (ручная сквозная). ✔
- §12 UI — Task 17/18/19. ✔
- §14 Фаза 2 — намеренно вне плана. ✔

**Плейсхолдеры:** конкретный код во всех шагах; «повтори по образцу» — только там, где структура соседнего кода уже задана (роуты/сайдбар), без выдуманных API.

**Согласованность типов:** `CalendarSyncService.enqueueUpsert(userId, trainingId, time)` — вызовы в Task 15 совпадают; `eventIdFor` — Task 5/10/12; `buildEventResource`/`GoogleEventResource` — Task 7 ↔ Task 10/12; `CalendarConnectionService` методы — Task 9 ↔ Task 11/12/14.

# Часовой пояс календаря (#2) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Исправить сдвиг времени событий: определять часовой пояс из браузера тренера, дать пикер в настройках, при смене пояса пере-синхронизировать будущие события.

**Architecture:** `select` перестаёт брать пояс из Google (источник UTC) и берёт его из тела запроса (браузерный `Intl`, фолбэк `Europe/Moscow`). Новый эндпоинт `POST /calendar/timezone` меняет пояс и зовёт существующий `backfill`. На фронте — пикер с курированным списком РФ/СНГ в карточке настроек.

**Tech Stack:** NestJS + Sequelize (backend), React + antd (frontend). Спецификация: `docs/superpowers/specs/2026-06-08-calendar-timezone-design.md`.

**Ветка:** `feat/google-calendar-sync` (продолжаем).

**Условные обозначения:** `BE=apps/backend`, `FE=apps/frontend`. Бэкенд-сборка: `npx tsc -p apps/backend/tsconfig.json --noEmit`. Фронт-сборка: `npm run build -w apps/frontend`. У фронта нет тест-раннера — проверка сборкой + ручным прогоном. Серверы могут быть запущены в фоне — игнорировать, запускать команды сборки явно.

---

## File Structure

**Новые:**
- `apps/backend/src/modules/calendar/dto/set-timezone.dto.ts` — тело `POST /calendar/timezone`.
- `apps/frontend/src/entities/calendar/timezones.ts` — курированный список + `buildTimeZoneOptions`.

**Изменяемые (backend):**
- `apps/backend/src/modules/calendar/dto/select-calendar.dto.ts` — `timeZone?`.
- `apps/backend/src/modules/calendar/services/calendar-connection.service.ts` — `setTimeZone`.
- `apps/backend/src/modules/calendar/calendar.controller.ts` — `select` (из `dto.timeZone`), новый `@Post('timezone')`.

**Изменяемые (frontend):**
- `apps/frontend/src/entities/calendar/calendar.repo.ts` — `setTimeZone`, `timeZone` в `select`.
- `apps/frontend/src/pages/settings/google-calendar-card.tsx` — пикер + браузерный пояс при подключении.
- `apps/frontend/src/locales/ru/translation.json`, `apps/frontend/src/locales/en/translation.json` — строки.

---

## Task 1: Бэкенд — DTO, сервис, контроллер

**Files:**
- Modify: `apps/backend/src/modules/calendar/dto/select-calendar.dto.ts`
- Create: `apps/backend/src/modules/calendar/dto/set-timezone.dto.ts`
- Modify: `apps/backend/src/modules/calendar/services/calendar-connection.service.ts`
- Modify: `apps/backend/src/modules/calendar/calendar.controller.ts`

- [ ] **Step 1: `timeZone?` в `SelectCalendarDto`**

В `apps/backend/src/modules/calendar/dto/select-calendar.dto.ts` добавить поле (после `name`):
```ts
  @IsOptional()
  @IsString()
  timeZone?: string
```
(Импорты `IsOptional`, `IsString` уже есть.)

- [ ] **Step 2: Новый `SetTimezoneDto`**

Создать `apps/backend/src/modules/calendar/dto/set-timezone.dto.ts`:
```ts
import { IsNotEmpty, IsString } from 'class-validator'

export class SetTimezoneDto {
  @IsString()
  @IsNotEmpty()
  timeZone!: string
}
```

- [ ] **Step 3: `setTimeZone` в сервисе подключений**

В `apps/backend/src/modules/calendar/services/calendar-connection.service.ts` добавить метод в класс (рядом с `setCalendar`):
```ts
  async setTimeZone(userId: string, timeZone: string): Promise<void> {
    await this.model.update({ calendarTimeZone: timeZone }, { where: { userId } })
  }
```

- [ ] **Step 4: `select` берёт пояс из тела**

В `apps/backend/src/modules/calendar/calendar.controller.ts` в методе `select` заменить блок:
```ts
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
```
на:
```ts
    const timeZone = dto.timeZone || 'Europe/Moscow'
    let calendarId = dto.calendarId ?? ''
    if (dto.create) {
      const created = await this.google.createCalendar(token, dto.name || 'TriKick', timeZone)
      calendarId = created.id
    }

    await this.connections.setCalendar(user.id, calendarId, timeZone)
```
(Больше не доверяем поясу Google. `primaryTimeZone` и `listCalendars` в `select` не нужны.)

- [ ] **Step 5: Новый эндпоинт `POST /calendar/timezone`**

В том же контроллере добавить импорт DTO рядом с `import { SelectCalendarDto } from './dto/select-calendar.dto'`:
```ts
import { SetTimezoneDto } from './dto/set-timezone.dto'
```
И добавить метод (после `resync`, перед `disconnect`):
```ts
  /** Сменить часовой пояс и пере-синхронизировать будущие занятия. */
  @Post('timezone')
  @UseGuards(JwtAuthGuard)
  async setTimeZone(@CurrentUser() user: CurrentUserPayload, @Body() dto: SetTimezoneDto) {
    await this.connections.setTimeZone(user.id, dto.timeZone)
    return { backfilled: await this.sync.backfill(user.id) }
  }
```

- [ ] **Step 6: Сборка**

Run: `npx tsc -p apps/backend/tsconfig.json --noEmit`
Expected: без ошибок. (Если ругается на неиспользуемый `primaryTimeZone` — это метод сервиса, он остаётся в `google-oauth.service`, просто не зовётся из `select`; ошибки быть не должно.)

- [ ] **Step 7: Тесты бэкенда не сломаны**

Run: `npm test -w backend`
Expected: PASS (существующие тесты).

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/calendar/dto/select-calendar.dto.ts apps/backend/src/modules/calendar/dto/set-timezone.dto.ts apps/backend/src/modules/calendar/services/calendar-connection.service.ts apps/backend/src/modules/calendar/calendar.controller.ts
git commit -m "feat(backend): часовой пояс из тела select + POST /calendar/timezone"
```

---

## Task 2: Фронтенд — курированный список поясов

**Files:**
- Create: `apps/frontend/src/entities/calendar/timezones.ts`

- [ ] **Step 1: Создать модуль**

Создать `apps/frontend/src/entities/calendar/timezones.ts`:
```ts
export interface TimeZoneItem {
  id: string
  label: string
}

/** Курированный список поясов РФ/СНГ (от запада к востоку + ближнее зарубежье). */
export const CURATED_TIMEZONES: TimeZoneItem[] = [
  { id: 'Europe/Kaliningrad', label: 'Калининград (MSK−1)' },
  { id: 'Europe/Moscow', label: 'Москва (MSK)' },
  { id: 'Europe/Samara', label: 'Самара (MSK+1)' },
  { id: 'Asia/Yekaterinburg', label: 'Екатеринбург (MSK+2)' },
  { id: 'Asia/Omsk', label: 'Омск (MSK+3)' },
  { id: 'Asia/Krasnoyarsk', label: 'Красноярск (MSK+4)' },
  { id: 'Asia/Irkutsk', label: 'Иркутск (MSK+5)' },
  { id: 'Asia/Yakutsk', label: 'Якутск (MSK+6)' },
  { id: 'Asia/Vladivostok', label: 'Владивосток (MSK+7)' },
  { id: 'Asia/Magadan', label: 'Магадан (MSK+8)' },
  { id: 'Asia/Kamchatka', label: 'Камчатка (MSK+9)' },
  { id: 'Europe/Minsk', label: 'Минск' },
  { id: 'Europe/Kyiv', label: 'Киев' },
  { id: 'Asia/Almaty', label: 'Алматы' },
  { id: 'Asia/Tashkent', label: 'Ташкент' },
]

/**
 * Опции для Select. Если текущий пояс не входит в курированный список — добавляем
 * его отдельной опцией сверху, чтобы тренер не остался без своего пояса.
 */
export function buildTimeZoneOptions(
  current?: string | null,
): { value: string; label: string }[] {
  const options = CURATED_TIMEZONES.map((z) => ({ value: z.id, label: z.label }))
  if (current && !CURATED_TIMEZONES.some((z) => z.id === current)) {
    options.unshift({ value: current, label: current })
  }
  return options
}
```

- [ ] **Step 2: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок (модуль ещё не используется — это нормально).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/entities/calendar/timezones.ts
git commit -m "feat(frontend): курированный список часовых поясов"
```

---

## Task 3: Фронтенд — репозиторий и пикер в карточке

**Files:**
- Modify: `apps/frontend/src/entities/calendar/calendar.repo.ts`
- Modify: `apps/frontend/src/pages/settings/google-calendar-card.tsx`

- [ ] **Step 1: API в репозитории**

В `apps/frontend/src/entities/calendar/calendar.repo.ts`:
- расширить сигнатуру `select` полем `timeZone?`:
```ts
  select: (body: {
    calendarId?: string
    create?: boolean
    name?: string
    timeZone?: string
  }): Promise<unknown> => apiClient.post('/calendar/select', body),
```
- после `resync` добавить:
```ts
  setTimeZone: (timeZone: string): Promise<{ backfilled: number }> =>
    apiClient.post<{ backfilled: number }>('/calendar/timezone', { timeZone }),
```

- [ ] **Step 2: Импорты в карточке**

В `apps/frontend/src/pages/settings/google-calendar-card.tsx`:
- в импорт antd добавить `Select`:
```tsx
import { Alert, Button, Card, List, Modal, Select, Space, Tag, Typography, message } from 'antd'
```
- после импорта `calendarRepo` добавить:
```tsx
import { buildTimeZoneOptions } from 'entities/calendar/timezones'
```

- [ ] **Step 3: Слать браузерный пояс при выборе календаря**

В функции `choose` заменить строку `await calendarRepo.select(body)` на:
```tsx
      await calendarRepo.select({
        ...body,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
```

- [ ] **Step 4: Обработчик смены пояса**

Рядом с функцией `resync` добавить:
```tsx
  const changeTimeZone = async (tz: string) => {
    const { backfilled } = await calendarRepo.setTimeZone(tz)
    await refresh()
    message.success(t('settings.google.timeZoneUpdated', { count: backfilled }))
  }
```

- [ ] **Step 5: Пикер в блоке подключённого календаря**

В ветке `status === 'connected' && state?.calendarId` (где `Tag` + кнопки `resync`/`changeCalendar`/`disconnect`), сразу после `<Space wrap> … </Space>` с кнопками, перед закрывающим `</>`, добавить:
```tsx
            <div style={{ marginTop: 8 }}>
              <Typography.Text type="secondary">
                {t('settings.google.timeZoneLabel')}
              </Typography.Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                value={state.calendarTimeZone ?? undefined}
                options={buildTimeZoneOptions(state.calendarTimeZone)}
                onChange={changeTimeZone}
                showSearch
                optionFilterProp="label"
              />
            </div>
```

- [ ] **Step 6: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок типов.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/entities/calendar/calendar.repo.ts apps/frontend/src/pages/settings/google-calendar-card.tsx
git commit -m "feat(frontend): пикер часового пояса в карточке Google Календаря"
```

---

## Task 4: Локализация

**Files:**
- Modify: `apps/frontend/src/locales/ru/translation.json`
- Modify: `apps/frontend/src/locales/en/translation.json`

- [ ] **Step 1: Строки (ru)**

В `apps/frontend/src/locales/ru/translation.json`, внутри объекта `"settings"."google"`, добавить ключи (через запятую, следить за валидностью JSON):
```json
      "timeZoneLabel": "Часовой пояс",
      "timeZoneUpdated": "Пояс обновлён, пере-синхронизировано занятий: {{count}}"
```

- [ ] **Step 2: Строки (en)**

В `apps/frontend/src/locales/en/translation.json`, внутри `"settings"."google"`, добавить:
```json
      "timeZoneLabel": "Time zone",
      "timeZoneUpdated": "Time zone updated, sessions re-synced: {{count}}"
```

- [ ] **Step 3: Валидность JSON + сборка**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('apps/frontend/src/locales/ru/translation.json','utf8'));JSON.parse(require('fs').readFileSync('apps/frontend/src/locales/en/translation.json','utf8'));console.log('JSON ok')"
npm run build -w apps/frontend
```
Expected: `JSON ok`, затем сборка без ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/locales/ru/translation.json apps/frontend/src/locales/en/translation.json
git commit -m "feat(frontend): строки часового пояса календаря"
```

---

## Task 5: Ручная проверка end-to-end

**Предусловие:** MySQL, бэкенд (3021), фронтенд (3020) запущены; есть подключение Google (`connected`, сейчас пояс `UTC`). Демо `demo@trikick.ru` / `demo1234`. Перезапустить серверы, если нужно подхватить изменения.

- [ ] **Step 1: Перезапуск серверов**

Run:
```bash
lsof -ti tcp:3020 -sTCP:LISTEN | xargs kill 2>/dev/null; lsof -ti tcp:3021 -sTCP:LISTEN | xargs kill 2>/dev/null
cd "/Users/StepOne/Desktop/Мой проект" && npm run dev:backend > /tmp/trikick-backend.log 2>&1 &
cd "/Users/StepOne/Desktop/Мой проект" && npm run dev > /tmp/trikick-frontend.log 2>&1 &
```
Expected: оба слушают порты; в логе бэка есть `Mapped {/api/calendar/timezone, POST}`.

- [ ] **Step 2: Починка существующего пояса**

Настройки → карточка «Google Календарь» → новый пикер «Часовой пояс» показывает текущий (`UTC`, добавлен отдельной опцией) → выбрать «Москва (MSK)».
Expected: тост «Пояс обновлён, пере-синхронизировано занятий: N».

- [ ] **Step 3: Проверка в БД и Google**

Run:
```bash
/opt/homebrew/opt/mysql/bin/mysql -u trikick -ptrikick trikick --table -e "SELECT calendar_time_zone FROM calendar_connections; SELECT operation, status, COUNT(*) n FROM calendar_sync_tasks WHERE created_at > (UTC_TIMESTAMP() - INTERVAL 5 MINUTE) GROUP BY operation, status;"
```
Expected: `calendar_time_zone = Europe/Moscow`; свежие `upsert/done`. В Google Календаре будущие события встали на верное (московское) время — сдвиг +3 ушёл.

- [ ] **Step 4: Переподключение шлёт браузерный пояс**

(Опционально, если не жалко переподключать.) Отключить → Подключить заново → выбрать/создать календарь.
Expected: в БД `calendar_time_zone` = пояс браузера (для Москвы — `Europe/Moscow`), а не `UTC`.

---

## Notes / ограничения (из спецификации)

- Прошлые события не пере-синхронизируются (только будущие — существующий `backfill`).
- Список поясов курированный, не полный IANA; чужой пояс добавляется отдельной опцией.
- `primaryTimeZone` остаётся в `google-oauth.service`, но из `select` больше не вызывается (можно удалить позже, вне объёма).

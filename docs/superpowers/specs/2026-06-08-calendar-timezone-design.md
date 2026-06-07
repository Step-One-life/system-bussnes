# Часовой пояс календаря — дизайн

**Дата:** 2026-06-08
**Статус:** утверждён дизайн, ожидает вычитки спецификации
**Ветка:** `feat/google-calendar-sync` (продолжаем)

## 1. Цель

Исправить баг: события в Google уезжают на +3 к Москве, потому что при подключении
часовой пояс берётся из основного Google-календаря тренера (`primaryTimeZone`), а он
вернул `UTC`. Решение: определять пояс из браузера тренера, дать пикер в настройках для
переопределения, и при смене пояса пере-синхронизировать будущие события.

## 2. Решения (итог брейншторма)

| Вопрос | Решение |
|---|---|
| Дефолт пояса | Из браузера тренера (`Intl.DateTimeFormat().resolvedOptions().timeZone`), фолбэк `Europe/Moscow`. |
| Пикер | Курированный список РФ/СНГ; если текущий/браузерный пояс не в списке — добавляем его отдельной опцией. |
| Пере-синк при смене | Автоматически, только будущие занятия (существующий `backfill`). |
| Источник Google (`primaryTimeZone`) | Убираем — это и был источник бага. |

## 3. Что НЕ входит

- Пере-синхронизация прошлых событий (только будущие, как сейчас).
- Полный список IANA-поясов (берём курированный + текущий).
- Автоопределение DST вручную (IANA/Google делают сами).

## 4. Бэкенд

- **`SelectCalendarDto`** — добавить опциональное поле `timeZone?: string` (`@IsOptional`
  `@IsString`).
- **`calendar.controller.ts → select`:** убрать `let timeZone = await this.google.primaryTimeZone(token)`.
  Вместо этого `const timeZone = dto.timeZone || 'Europe/Moscow'`. При `dto.create`
  по-прежнему `createCalendar(token, name, timeZone)` (новый календарь получит этот пояс);
  при выборе существующего — **не** перетираем поясом из Google, храним переданный
  `timeZone` (его и использует сборщик события).
- **Новый DTO** `dto/set-timezone.dto.ts`: `{ timeZone: string }` (`@IsString` `@IsNotEmpty`).
- **Новый эндпоинт** `@Post('timezone')` (под `JwtAuthGuard`): `setTimeZone(user.id, dto.timeZone)`
  → `backfill(user.id)` → вернуть `{ backfilled }`.
- **`CalendarConnectionService.setTimeZone(userId, timeZone)`** — `update({ calendarTimeZone:
  timeZone }, { where: { userId } })`.

Событие строится из `conn.calendarTimeZone` (`event-builder` уже так делает) — менять
сборщик не нужно.

## 5. Фронтенд

- **При подключении** (вызов `select` из карточки) добавлять в тело
  `timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Курированный список** — новый модуль `entities/calendar/timezones.ts`:
  массив `{ id: IANA, label }` (Калининград MSK−1 … Камчатка MSK+9, плюс Киев/Минск/
  Алматы/Ташкент) + функция `buildTimeZoneOptions(current?: string)`, которая возвращает
  опции списка и, если `current` не входит в список, добавляет его отдельной опцией
  сверху/снизу.
- **Пикер в `pages/settings/google-calendar-card.tsx`:** `Select` со значением
  `state.calendarTimeZone`, опции из `buildTimeZoneOptions(state.calendarTimeZone)`.
  Показывается только при `status === 'connected'` и выбранном календаре. При изменении →
  `calendarRepo.setTimeZone(id)` → тост `settings.google.timeZoneUpdated` (с числом
  пере-синхронизированных) → обновить состояние.
- **`entities/calendar/calendar.repo.ts`:** добавить `setTimeZone(timeZone)` (POST
  `/calendar/timezone`) и добавить `timeZone` в тело `select`.

## 6. Починка существующего подключения и граничные случаи

- **Текущее UTC-подключение:** чинится пикером — выбрать «Москва» → сохранение →
  `backfill` пере-синкает будущие события. Миграция не нужна.
- **Невалидный пояс:** на практике невозможен (`Intl` отдаёт валидный IANA, пикер — только
  корректные id). Бэкенд принимает строку как есть.
- **Пояс до выбора календаря:** `backfill` уже защищён (`if (!isActive) return 0`) — пояс
  сохранится, синк не побежит.
- **Пикер виден только** при `status === 'connected'` и выбранном `calendarId`.

## 7. Файлы

**Новые:**
- `apps/backend/src/modules/calendar/dto/set-timezone.dto.ts`.
- `apps/frontend/src/entities/calendar/timezones.ts`.

**Изменяемые (backend):**
- `apps/backend/src/modules/calendar/dto/select-calendar.dto.ts` — `timeZone?`.
- `apps/backend/src/modules/calendar/calendar.controller.ts` — `select` (использовать
  `dto.timeZone`), новый `@Post('timezone')`.
- `apps/backend/src/modules/calendar/services/calendar-connection.service.ts` — `setTimeZone`.

**Изменяемые (frontend):**
- `apps/frontend/src/entities/calendar/calendar.repo.ts` — `setTimeZone`, `timeZone` в `select`.
- `apps/frontend/src/pages/settings/google-calendar-card.tsx` — пикер.
- `apps/frontend/src/locales/ru/translation.json`, `…/en/translation.json` — строки.

## 8. Тестирование

- **Сборка:** `npx tsc -p apps/backend/tsconfig.json --noEmit`, `npm run build -w apps/frontend`.
- **Ручное:**
  - Настройки → пикер показывает текущий пояс (`UTC`) → сменить на «Москва» → тост →
    в Google будущие события сдвинулись на верное время; в БД `calendar_time_zone =
    Europe/Moscow`.
  - Проверить SQL (через `UTC_TIMESTAMP()` из-за UTC-хранения): после смены —
    свежие `upsert/done` в `calendar_sync_tasks`.
  - Переподключение шлёт браузерный пояс → новое подключение получает `Europe/Moscow`
    (не `UTC`).

## 9. Открытые ограничения (осознанно)

- Прошлые события не пере-синхронизируются (только будущие).
- Список поясов курированный, не полный IANA.

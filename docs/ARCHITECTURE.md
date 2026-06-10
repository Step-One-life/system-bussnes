# TriKick — карта проекта и архитектура

> Единый справочник: где что лежит, как устроены модули, история реализованных фич,
> важные ловушки и как запускать. Поддерживать в актуальном состоянии при крупных изменениях.
> Последнее обновление: 2026-06-09.

## 1. Что это

**TriKick** — веб-приложение для тренеров: ведение учеников, групп, индивидуальных и
групповых тренировок, абонементов, финансов (доходы клиентов и расходы зала, тарифы,
статистика) и односторонней синхронизации расписания в Google Календарь.

## 2. Стек и структура монорепо

Монорепо на npm workspaces:

```
apps/
  backend/    NestJS + Fastify + Sequelize + MySQL (порт 3021, префикс /api)
  frontend/   React + Vite + antd + react-query + i18next (порт 3020)
packages/
  shared/     @trikick/shared — общие типы и чистая логика (dual CJS+ESM сборка)
docs/
  ARCHITECTURE.md        ← этот файл
  backlog-pre-merge.md   список багов B1–B6 (все закрыты)
  superpowers/specs|plans/  спеки и планы по каждой фиче (см. §7)
```

**Конвенции кода:** без точек с запятой, одинарные кавычки, отступ 2 пробела. UI-тексты —
через i18next (`t('...')`), ключи в `apps/frontend/src/locales/{ru,en}/translation.json`.

## 3. Backend (`apps/backend/src`)

NestJS-модули в `modules/`:

| Модуль | Ответственность |
|---|---|
| `auth` | Регистрация/логин (JWT). Эндпоинты `POST /api/auth/register`, `/api/auth/login`. |
| `user` | Модель пользователя (тренера). |
| `group` | Группы (обычные и индивидуальные `is_individual`), расписание. |
| `student` | Ученики, **абонементы** (`subscriptions`), **посещения** (`visits`), списание занятий (`subscriptions.service`). |
| `location` | Локации (зал/студия/онлайн), прайм-окна. |
| `training` | Тренировки: создание, серии, отметка посещений, удаление, **серверный барьер наслоения** (`lib/training-overlap.ts`). |
| `finance` | Тарифы (`pricing-rules`), платежи (`payments`), расходы зала (`hall-costs`), копирование цен. |
| `calendar` | Синхронизация с Google Календарём: OAuth, аутбокс-воркер, шифрование токенов. |

**Ключевые детали backend:**
- Глобальный префикс **`/api`** (`main.ts: setGlobalPrefix('api')`), Swagger на `/api/docs`.
- Ответы обёрнуты в `{ data, success }` (глобальный интерсептор).
- `OwnedCrudService`/`OwnedEntity` — базовый слой «сущности, принадлежащей пользователю» (скоуп по `userId`).
- Миграции — **sequelize-cli** в `apps/backend/database/migrations/`, запуск `npm run migrate -w apps/backend`.
- Прайм-тайм — единая функция `@trikick/shared/lib/prime-time` (общая с фронтом).

## 4. Frontend (`apps/frontend/src`)

**`app/`** — каркас:
- `App.tsx` — провайдеры (`ErrorBoundary` → `QueryProvider` → `ThemeProvider` → `AuthProvider` → роутер).
- `providers/` — `auth-provider` (логин/выход, **сброс кэшей при смене аккаунта**), `query-provider` (react-query + `QueryCache.onError`), `theme-provider` (тема + `ConfigProvider locale={ruRU}`).
- `routes.tsx` — маршруты с **ленивой загрузкой** (`React.lazy` + `Suspense`).
- `layout/` — `sidebar`, `bottom-nav`, `nav-config`, `profile-menu` (настройки/тема/выход), `app-layout`.
- `i18n.ts`, `theme/`.

**`entities/`** — доменные модули (модель + API + UI):
- `auth`, `calendar` (карточка Google-календаря, repo), `groups`, `locations`, `students` (абонементы, дровер, визиты), `trainings`, `finance` (тарифы, платежи, статистика, авто-оплата).

**`pages/`** — экраны: `home`, `trainings`, `people` (вложенные `students`/`groups`/`individual`), `finance`, `settings`, `login`, `register`.

**`common/`** — `ui` (Badge, EmptyState, **ErrorBoundary**, KpiCard, PageHeader, ProgressBar, toast, WarningItem), `utils` (date, uuid), `services/api` (api-client, group-map), `hooks` (use-theme).

## 5. Shared (`packages/shared/src`)

- `enums/` — `SubscriptionType`, `ClientPaymentType`, `HallPaymentType`, `LessonKind`, `PricingFormat`, `LocationKind`, статусы.
- `api/shapes.ts` — формы запросов/ответов API.
- `domain/` — доменные модели.
- `lib/` — `prime-time` (прайм-тайм), `subscription-totals` (число занятий по типу).

## 6. База данных (таблицы)

`users`, `groups`, `students`, `student_groups`, `subscriptions`, `trainings`,
`training_attendees`, `visits`, `locations`, `pricing_rules`, `payments`, `hall_costs`,
`calendar_connections`, `calendar_sync_tasks`, `SequelizeMeta`.

Локально: MySQL, db/user/pass = `trikick`. Sequelize пишет timestamps в **UTC**.

## 7. История реализованных фич

Каждая фича прошла цикл спека → план → реализация (документы в `docs/superpowers/`). Всё в `main`.

| Фича | Спека/план (дата) | Суть |
|---|---|---|
| **Google Calendar sync (Фаза 1)** | `2026-06-04` | Односторонняя выгрузка расписания тренера в его Google-календарь. Аутбокс `calendar_sync_tasks` + воркер (`@nestjs/schedule`), per-user OAuth, refresh-токен шифруется AES-256-GCM, детерминированный id события из id тренировки. |
| **Редактирование тренировки** | `2026-06-06` | `EditTrainingModal`, `PATCH /trainings/recurring/:id` (серия), `useEditTraining`. |
| **Серии без абонемента (Часть 1)** | `2026-06-07` | Еженедельные индивидуальные серии независимо от абонемента, режим «Разово». `weeklySeriesDates`, `recurringId`, плановые занятия. |
| **Часовой пояс календаря** | `2026-06-08` | Пояс из тела запроса (`Intl`, фолбэк `Europe/Moscow`) + пикер, `POST /calendar/timezone`. |
| **Авто-оплата при отметке (Часть 2)** | `2026-06-08` | `markAttendanceWithPayment`: отметка без активного абонемента пишет разовый платёж по тарифу (`autoCreatePayment`). |
| **Баги B1–B6** | `backlog-pre-merge.md` | B1 сброс кэшей при смене аккаунта; B2 `locale=ruRU` (неделя с ПН); B3 вёрстка календаря; B4 навигация по периодам статистики; B5 виджет «Ожидают оплаты»; B6 меню профиля. |
| **Защита от наслоения** | `fix/training-overlap` | Проверка конфликта по всем датам серии (фронт) + серверный барьер `findOverlaps` (409). |
| **Одиночное занятие → плановое** | — | Одиночное индивидуальное создаётся плановым; списание/оплата при отметке. |
| **Мягкие улучшения** | — | `ErrorBoundary`, ленивая загрузка страниц, полный перевод `en`-локали. |
| **Парные (сплит) тренировки** | `2026-06-09` | 2 ученика, разовая, цена/зал «на одного», оплата при отметке (`single_pair`/`single_pair_90`, `LessonKind 'pair'`), `is_pair` + `planned_student_id_2`, серия. Бэк `markAttendance` не списывает абонемент при `is_pair`. |
| **Единая отметка ⇄ деньги на бэке** | `2026-06-10` | Биллинг отметки целиком в `training.service.markAttendance`: абонемент (вкл. общий) → списать, иначе/парное → авто-платёж по тарифу (`lib/attendance-pricing.ts`). Визит помнит результат (`visits.billing`/`subscription_id`/`payment_id`), откат `revertVisit` отменяет ровно его; повторная отметка идемпотентна. `POST :id/attendees` → `{ training, billing[] }`; все 4 точки UI на одних эндпоинтах; фронтовые `markAttendanceWithPayment` и ручные откаты удалены. Предоплата абонемента при покупке — отдельный поток, при снятии отметки НЕ удаляется. |

## 8. Важные ловушки и соглашения

- **UTC vs NOW():** Sequelize пишет `created_at`/`updated_at` в UTC, а MySQL `NOW()` отдаёт
  локальное (MSK +3). Для SQL-диагностики «за последние N минут» использовать `UTC_TIMESTAMP()`.
- **Новый вид занятия / тип оплаты добавляется в МНОГИХ местах** (иначе валидация/отображение
  ломаются). Чек-лист на примере pair: `shared/enums` (`LessonKind`, `ClientPaymentType`);
  `frontend/entities/finance/model/types.ts` (дубль типов); `finance/lib/pricing-lookup.ts`
  (`subTypeToTuple`, `clientTypeToTuple`); `finance/lib/auto-payment.ts` (`SubType`,
  `subPaymentType`); `finance/model/finance-constants.ts` (`FIN_SESSIONS`, `FIN_LABELS`);
  `finance/pricing/pricing-config.ts` (`LESSON_KINDS`); `finance/form/payment-form-config.ts`
  (опции формы); **backend** `finance/finance.constants.ts` (`FIN_SESSIONS`),
  DTO-валидаторы `create-pricing-rule` (`LESSON_KINDS`), `create-payment` (`CLIENT_TYPES`),
  `create-hall-cost` (`HALL_TYPES`); локали ru/en.
- **`training.groupId` на фронте = ИМЯ группы**, не UUID; репозиторий мапит UUID↔имя
  (`common/services/api/group-map`).
- **Индивидуальные/онлайн/парные занятия** привязаны к индивидуальной группе-контейнеру
  (`ensureIndividualGroup`), помечаются признаками (`is_online`, `is_pair`).
- **Прайм-тайм** считать только через `@trikick/shared/lib/prime-time` (единый источник).
- **Смена аккаунта** должна сбрасывать кэши: `queryClient.clear()` + `invalidateLocations()`
  + `invalidateGroupMap()` (в `auth-provider`), иначе данные «протекают» между аккаунтами.

## 9. Запуск локально

```bash
# 1. MySQL запущен, БД/пользователь trikick
# 2. Миграции
npm run migrate -w apps/backend
# 3. Бэкенд (порт 3021)
npm run start:dev -w apps/backend
# 4. Фронтенд (порт 3020)
npm run dev
```

Демо-вход: `demo@trikick.ru` / `demo1234`. Сборки-проверки:
`npm run build -w apps/frontend` (tsc+vite), `npm run build -w apps/backend` (nest),
`npm test -w apps/backend` (jest — чистые функции).

## 10. Google Calendar — статус публикации

Код **многопользовательский** (per-user OAuth). Ограничение — настройка в Google Cloud Console:
приложение в режиме **«Testing»** (доступ только у добавленных test users). Чтобы открыть для всех:
1. деплой на публичный домен (нужен для redirect URI и Privacy Policy);
2. заполнить OAuth consent screen (privacy policy, terms, домен, обоснование scope);
3. **Publish App** (Testing → Production);
4. пройти **верификацию Google** (scope `.../auth/calendar` — sensitive: демо-видео, проверка домена);
5. обновить env `GOOGLE_OAUTH_REDIRECT_URI`/client id/secret на прод.

Env (опциональные, без них синхронизация просто неактивна): `GOOGLE_OAUTH_CLIENT_ID`,
`GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `CALENDAR_TOKEN_ENC_KEY`.

Промежуточно можно опубликовать в Production без верификации: пользователи увидят
предупреждение «Google hasn't verified this app» (Advanced → Continue), лимит ~100 пользователей.

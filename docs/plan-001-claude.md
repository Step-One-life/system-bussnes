# План-001 — Локации + гибкие тарифы. Рабочий план реализации

> **Документ для агента в новой сессии.** Эта сессия не может выполнить задачу
> (галлюцинация «court» перед вызовами инструментов ломает парсинг). Здесь
> записано ВСЁ необходимое, чтобы продолжить с нуля без потери контекста.
> Сначала прочитай `.claude/CLAUDE.md` — правило про запрет текста перед тегом
> вызова инструмента.

---

## 0. Контекст и источник задачи

Исходный план — `plans/plan-001.md` — это разбор от консультанта: текущий блок
цен сделан как фиксированная форма «под одного тренера и одну локацию», и его
надо переделать в гибкую модель **`Локация + Тариф = Цена`**.

### Решения пользователя (зафиксированы, не переспрашивать)

1. **Мульти-тренерность НЕ нужна.** Один тренер = владелец аккаунта (`user`).
   Фильтр «Тренер» из plan-001 не делаем. `OwnedEntity.userId` уже = тренер.
2. **Локация — новая сущность.** У тренировки (`training`) есть локация.
3. **Тариф гибкий:**
   - Длительность занятия: дефолтные пресеты **1:00 / 1:30 / 2:00**, но можно
     ввести своё время. Хранить в минутах (`int`).
   - Количество тренировок в абонементе: дефолты **1 / 4 / 8**, можно ввести
     своё число.
4. **Данные НЕ терять.** На тестовом стенде уже боевая БД, пользователи начали
   заполнять цены. Миграция обязана перенести существующий JSON-pricing.

### Развёртывание / окружение

- Монорепо npm workspaces: `apps/backend` (NestJS+Fastify+Sequelize+MySQL),
  `apps/frontend` (React 19+TS+Vite+AntD), `packages/shared` (`@trikick/shared`).
- Локальная БД: MySQL `root` / `ozma.split` / база `trick_step`
  (см. `apps/backend/.env`).
- Dev-фронт порт **3020**, backend **3021**.
- Тестовый стенд: 94.19.63.62, домен `trick.ozma-split.com`, backend+mysql в
  Docker. Деплой — `make deploy-test` (см. `scripts/deploy-test.sh`).
- Конвенции кода — `plans/default.md`: lodash вместо нативных методов,
  структура `entities/{name}/{list,form,details}`, AntD, i18n (все литералы в
  ключи, язык русский), TanStack Query, файлы ≤200–300 строк, kebab-case,
  именовать анонимные обработчики в компонентах.

---

## 1. Текущее состояние (как есть сейчас)

### Backend — модуль finance (`apps/backend/src/modules/finance/`)

Три таблицы (миграция `database/migrations/20260101000005-create-finance.js`):

- **`pricing`** — `id`, `user_id` UNIQUE, `data JSON`, таймстемпы.
  Цены хранятся как ОДНА JSON-строка на пользователя: плоский словарь
  `{ "client_single_individual_price": 2500, "hall_single_individual_regular_price": 500, ... }`.
  Модель `pricing.model.ts`, сервис `pricing.service.ts` (методы `get`/`save` —
  upsert одной строки).
- **`hall_costs`** — расход залу: `user_id`, `student_id?`, `hall_payment_type`,
  `time_slot` (`regular`/`prime`), `training_time`, `hall_amount DECIMAL`,
  `sessions_total`, `sessions_remaining`, `paid_at`, `status`, `notes`.
- **`payments`** — доход от клиента: `user_id`, `student_id?`,
  `client_payment_type`, `client_amount DECIMAL`, `sessions_*`, `paid_at`,
  `status`, `notes`, `hall_cost_id?` (FK на hall_costs).

### Доменные enums (`packages/shared/src/enums/index.ts`)

```ts
export type SubscriptionType = '1' | '4' | '8' | '1_90' | '4_90' | '8_90'
export type ClientPaymentType =
  | 'single_individual' | 'single_group'
  | 'individual_sub_4' | 'group_sub_4'
  | 'individual_sub_8' | 'group_sub_8'
  | 'single_individual_90' | 'individual_sub_4_90' | 'individual_sub_8_90'
export type HallPaymentType = ClientPaymentType
export type TimeSlot = 'regular' | 'prime'
```

`FIN_SESSIONS` в `finance.constants.ts` маппит тип → число занятий.

### Фронт — pricing экран

- `entities/finance/pricing/pricing-config.ts` — `CLIENT_GROUPS` и
  `HALL_GROUPS`: жёстко зашитые секции с ключами вида
  `client_single_individual_price`, `hall_single_individual_regular_price`.
- `pricing-tab.tsx` — рендерит секции; ключи собираются строками
  `${row.keyBase}_regular_price` / `_prime_price`.
- `use-pricing-form.ts` — форма; `price-row.tsx` — строки.
- `lib/auto-payment.ts` — при создании абонемента ученику авто-создаёт
  `payment` + `hall_cost`, читая ЦЕНЫ из плоских ключей pricing:
  `pricing['client_${type}_price']`, `pricing['hall_${type}_${slot}_price']`.
- `model/finance.repo.ts` — API-маппер (backend camelCase ↔ фронт snake_case).
- `form/use-payment-form.ts` — подставляет суммы из pricing по тем же ключам.

### Тренировка (`apps/backend/src/modules/training/training.model.ts`)

Таблица `trainings`: `user_id`, `group_id`, `date`, `time`, `note`, `is_prime`,
`session_duration` (int, минуты, дефолт 60), `recurring`, `recurring_id`.
**Привязки к месту НЕТ.**

### Где захардкожены типы абонементов `1/4/8`

~25 файлов (backend DTO, frontend students/trainings/finance). Полный список —
вывод `grep -rln "'1'\|'4'\|'8'\|SubscriptionType\|sub_4\|sub_8" apps packages`.
**ВАЖНО:** это связывает абонементы учеников (`subscription`) с тарифами. При
переходе на гибкие тарифы НЕ ломать существующую логику абонементов — см. §4.

---

## 2. Целевая модель данных

### Новая таблица `locations`

| колонка | тип | примечание |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK→users, CASCADE | владелец = тренер |
| `name` | STRING NOT NULL | «Основной зал» |
| `address` | STRING NULL | |
| `kind` | STRING NOT NULL default `'hall'` | `hall`/`studio`/`outdoor`/`online` |
| `is_default` | BOOLEAN default `false` | локация по умолчанию |
| `archived` | BOOLEAN default `false` | мягкое скрытие вместо удаления |
| `created_at`/`updated_at` | DATE | |

### Новая таблица `pricing_rules` (замена JSON-словаря)

Одна строка = один тариф для одной локации.

| колонка | тип | примечание |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK→users, CASCADE | |
| `location_id` | UUID FK→locations, CASCADE | |
| `title` | STRING NOT NULL | «Индив. абонемент 4» |
| `lesson_kind` | STRING NOT NULL | `individual` / `group` |
| `format` | STRING NOT NULL | `single` / `subscription` |
| `duration_minutes` | INT NOT NULL | 60 / 90 / 120 / произвольное |
| `sessions_count` | INT NOT NULL | 1 / 4 / 8 / произвольное |
| `client_price` | DECIMAL(10,2) | обычная цена клиента |
| `client_prime_price` | DECIMAL(10,2) | prime-цена клиента |
| `hall_cost` | DECIMAL(10,2) | обычный расход залу |
| `hall_prime_cost` | DECIMAL(10,2) | prime-расход залу |
| `active` | BOOLEAN default `true` | |
| `created_at`/`updated_at` | DATE | |

Старую таблицу `pricing` **не удаляем сразу** — оставляем как fallback до
проверки миграции, удаляем отдельной миграцией позже.

### Изменение `trainings`

Добавить `location_id UUID NULL` FK→locations (NULL для старых записей; новые —
с локацией). Аналогично можно добавить `location_id` в `groups` (опционально,
по решению при реализации — у группы постоянное место).

### Изменение `hall_costs` / `payments`

Добавить `location_id UUID NULL` FK→locations — чтобы расход/доход знал, к
какой локации относится (для статистики по локациям). NULL для старых.

---

## 3. Миграция данных (КРИТИЧНО — не терять)

Отдельная Sequelize-миграция (новый файл, дата позже существующих, напр.
`20260201000001-add-locations-and-pricing-rules.js`). Шаги в `up`:

1. `createTable('locations', ...)`.
2. `createTable('pricing_rules', ...)`.
3. `addColumn('trainings','location_id',...)`, то же для `hall_costs`,
   `payments`, (опц. `groups`).
4. **Data-миграция в той же миграции (raw SQL через `queryInterface.sequelize`):**
   - Для каждого `user_id`, у кого есть строка в `pricing`:
     - создать локацию «Основной зал» (`is_default=true`);
     - распарсить `pricing.data` JSON и разложить плоские ключи в строки
       `pricing_rules`. Маппинг ключей → тариф:
       - `client_single_individual_price` → `lesson_kind=individual`,
         `format=single`, `duration=60`, `sessions=1`, `client_price=значение`.
       - `client_single_group_price` → `group/single/60/1`.
       - `client_individual_sub_4_price` → `individual/subscription/60/4`.
       - `client_individual_sub_8_price` → `individual/subscription/60/8`.
       - `client_group_sub_4_price`, `client_group_sub_8_price` → аналогично.
       - `client_single_individual_90_price` → `individual/single/90/1`.
       - `client_individual_sub_4_90_price` → `individual/subscription/90/4`.
       - `client_individual_sub_8_90_price` → `individual/subscription/90/8`.
       - `hall_*_regular_price` → `hall_cost` соответствующего тарифа.
       - `hall_*_prime_price` → `hall_prime_cost`.
       - prime-цены клиента в старой модели для клиента отсутствовали как
         отдельные ключи (prime было только у зала) → `client_prime_price`
         инициализировать значением `client_price` (тренер потом скорректирует).
     - `hall_*` для 1.5ч переиспользовали 1ч-тарифы (см. `HALL_TYPE_ALIAS` в
       `auto-payment.ts`) — при разкладке проставить `hall_cost` и в 90-минутные
       тарифы из соответствующих 1ч-hall-ключей.
   - Для `user_id` без строки `pricing` — создать только локацию «Основной зал»
     с пустым набором тарифов (или дефолтным набором — по решению).
   - `UPDATE trainings/hall_costs/payments SET location_id = <id Основного зала
     этого user_id>` — привязать все существующие записи к дефолтной локации.
5. `down`: удалить добавленные колонки и таблицы (в обратном порядке).

**Перед деплоем миграции на тест:** снять дамп текущей БД тестового стенда
(`scripts/` уже умеет дампить). Прогнать миграцию сначала локально на копии.

---

## 4. Совместимость с абонементами учеников (НЕ сломать)

`SubscriptionType` (`'1'|'4'|'8'|'1_90'|'4_90'|'8_90'`) связан с типами в ~25
файлах. `auto-payment.ts` при создании абонемента подбирает тариф.

**Подход:** не выпиливать `SubscriptionType` сразу. Вместо чтения плоских
ключей pricing — `auto-payment.ts` и `use-payment-form.ts` должны находить
подходящую строку `pricing_rules` по `(location_id, lesson_kind, format,
duration_minutes, sessions_count)`. Маппинг `SubscriptionType` → этот кортеж:

```
'1'    → individual/single/60/1   (или group/single/60/1 если !isIndividual)
'4'    → */subscription/60/4
'8'    → */subscription/60/8
'1_90' → individual/single/90/1
'4_90' → individual/subscription/90/4
'8_90' → individual/subscription/90/8
```

Если строки тарифа для локации нет — сумма 0 (как сейчас при отсутствии ключа).
Локацию для авто-платежа брать из тренировки/группы, к которой привязан
абонемент; если её нет — дефолтная локация пользователя.

---

## 5. Структура изменений по файлам

### Backend — новый модуль `location`

`apps/backend/src/modules/location/` (образец — модуль `group`):
- `location.model.ts` — extends `OwnedEntity`, `@Table({tableName:'locations'})`.
- `location.controller.ts` — CRUD `@Controller('locations')`, `JwtAuthGuard`,
  `@CurrentUser`, паттерн как `group.controller.ts`.
- `location.service.ts` — extends `OwnedCrudService<Location>`.
- `location.module.ts` — `SequelizeModule.forFeature([Location])`, экспорт.
- `dto/create-location.dto.ts`, `dto/update-location.dto.ts` — class-validator,
  `implements` доменный тип из shared.
- Зарегистрировать `LocationModule` в `app.module.ts`.

### Backend — расширить finance

- `pricing-rule.model.ts` — новая модель.
- `pricing-rules.service.ts` — CRUD тарифов, метод поиска тарифа по кортежу
  (§4), копирование тарифов между локациями (кнопка «скопировать цены»).
- В `finance.controller.ts` добавить эндпоинты:
  `GET/POST/PATCH/DELETE /finance/pricing-rules`,
  `POST /finance/pricing-rules/copy` (из локации A в B).
- Старые `GET/PUT /finance/pricing` оставить временно для обратной
  совместимости или удалить после перевода фронта — решить при реализации.
- DTO: `create-pricing-rule.dto.ts`, `update-pricing-rule.dto.ts`,
  `copy-pricing.dto.ts`.
- `finance.module.ts` — добавить `PricingRule` в `forFeature`.

### Backend — training/hall-cost/payment

- Добавить `locationId` в модели `training.model.ts`, `hall-cost.model.ts`,
  `payment.model.ts` и соответствующие DTO (optional).

### packages/shared

- `domain/location.ts` — интерфейс `Location`.
- `domain/finance.ts` — добавить `PricingRule`, обновить/оставить `Pricing`.
- `enums/index.ts` — добавить `LocationKind`, `LessonKind`, `PricingFormat`.
- `index.ts` — `export * from './domain/location'`.

### Frontend — новая entity `locations`

`apps/frontend/src/entities/locations/` (образец — `entities/groups/`):
- `model/types.ts`, `model/locations.repo.ts` (API-маппер camelCase↔snake_case),
  `api/use-locations.ts` (TanStack Query хуки),
- `list/`, `form/` — список и форма локации (AntD), i18n-ключи.

### Frontend — переделать pricing экран

По plan-001 (§«Какой экран я бы сделал»):
- Селектор локации сверху + кнопка «+ Добавить локацию» + «Скопировать цены из
  другой локации».
- Две таблицы: «Цены для клиентов» (доход) и «Расходы на локацию» (расход).
  Колонки: тип занятия, формат, длительность, кол-во занятий, обычная цена,
  prime-цена.
- Кнопка «+ Добавить тариф» — форма строки с произвольной длительностью
  (пресеты 1:00/1:30/2:00 + ввод) и кол-вом занятий (1/4/8 + ввод).
- Блок расчёта маржи (цена клиента − расход зала, обычная и prime).
- На мобиле — карточки тарифов вместо таблицы.
- Файлы: переписать `pricing-tab.tsx`, `pricing-config.ts`, `price-row.tsx`,
  `use-pricing-form.ts`; добавить компоненты строки/формы тарифа. Держать
  файлы ≤200–300 строк — дробить.
- Обновить `auto-payment.ts` и `use-payment-form.ts` — см. §4.

### Frontend — локация в тренировке

- Форма тренировки — селектор локации (`entities/trainings/form/...`).
- Карточки/детали тренировки — показывать локацию.
- Меню/роутинг (`app/routes.tsx`, `App.tsx`) — добавить страницу локаций (или
  раздел внутри настроек/финансов — решить).

### i18n

Все новые литералы — в ключи (`apps/frontend/src/...locales` — найти, как
устроено). Русский обязателен, en дублировать.

---

## 6. Порядок выполнения (этапы)

Делать поэтапно, после каждого этапа — `npm run lint` + `npm run build`,
коммит. Telegram-уведомления по task-flow (chat_id `-1002147070319`).

1. **Этап 1 — shared:** доменные типы `Location`, `PricingRule`, enums. Сборка
   `npm run build:shared`.
2. **Этап 2 — backend, миграция:** новая миграция (таблицы + колонки + data-
   миграция §3). Прогнать `npm run migrate` локально, проверить, что старые
   цены разложились в `pricing_rules`, тренировки получили `location_id`.
3. **Этап 3 — backend, модуль location:** модель/контроллер/сервис/DTO/модуль.
4. **Этап 4 — backend, finance:** `PricingRule` модель/сервис/эндпоинты,
   копирование тарифов, поиск тарифа по кортежу. `locationId` в
   training/hall-cost/payment.
5. **Этап 5 — frontend, entity locations:** repo, хуки, список, форма.
6. **Этап 6 — frontend, pricing экран:** переделка под локации и таблицы
   тарифов, маржа, мобильные карточки.
7. **Этап 7 — frontend, интеграция:** локация в форме тренировки;
   `auto-payment.ts` / `use-payment-form.ts` на новые тарифы; меню/роутинг.
8. **Этап 8 — проверка:** `npm run lint`, `npm run build`, `npm run dev` (порт
   3020) — прокликать pricing, создание локации, создание абонемента
   (авто-платёж), создание тренировки с локацией.
9. **Этап 9 — деплой:** спросить пользователя; снять дамп БД теста; `make
   deploy-test`; проверить, что миграция на тесте прошла без потери данных.

---

## 7. Точки риска / на что смотреть

- **Миграция данных** — главный риск. Прогнать на копии тестовой БД до
  деплоя. Маппинг ключей §3 проверить на реальном `pricing.data` с теста
  (там уже есть заполненные цены).
- **`auto-payment.ts`** — связан с абонементами; ошибка тут ломает создание
  абонемента ученику. Покрыть проверкой вручную (создать абонемент 4/8/1.5ч).
- **camelCase ↔ snake_case** — фронт `finance.repo.ts` маппит вручную; для
  новых полей/сущностей не забыть мапперы.
- **`is_default` локации** — гарантировать ровно одну дефолтную на user
  (сервис: при установке новой — снимать флаг с прежней).
- **Размер файлов** — `pricing-tab.tsx` после переделки легко вырастет;
  дробить на компоненты.
- **`court`** — не писать никакого текста/слова перед тегом вызова инструмента
  (см. `.claude/CLAUDE.md`).

---

## 8. Решения пользователя по открытым вопросам (ЗАФИКСИРОВАНО)

- **Локация у группы:** ДА — добавить `groups.location_id`. Группа имеет
  локацию по умолчанию; новые тренировки группы берут её, можно переопределить
  в конкретной тренировке.
- **Экран локаций:** раздел в **Финансах** (вкладка/блок на странице финансов,
  рядом с настройкой цен) — НЕ отдельный пункт главного меню.
- **Старый API цен:** `GET/PUT /finance/pricing` + модель `Pricing` + таблица
  `pricing` **удалить после перевода фронта** на `pricing_rules` (таблицу —
  отдельной миграцией, после проверки data-миграции).
- **Дефолт тарифов:** новая локация создаётся **ПУСТОЙ** (без тарифов). Тренер
  добавляет тарифы сам или копирует из другой локации. Это касается и
  пользователя без старого `pricing` — у него локация «Основной зал» без
  тарифов.

---

## 9. Команды

```bash
# локально
npm install
npm run build:shared            # пересобрать shared после правки типов
npm run migrate                 # накатить миграции (локальная БД trick_step)
npm run build:all
npm run dev                     # фронт на :3020
npm run dev:backend             # backend на :3021
npm run lint

# деплой на тест (только с подтверждения пользователя)
make deploy-test
```

Ветку для работы: `git checkout -b feature/locations-pricing-rules`
(сейчас рабочее дерево: `plans/plan-001.md` staged+modified — закоммитить или
оставить отдельно перед созданием ветки).

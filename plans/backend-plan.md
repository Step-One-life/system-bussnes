# План backend — TriKick (apps/backend)

Пошаговый план создания бэкенда TriKick и переноса хранения данных из
localStorage фронтенда в API + БД.

**Архитектурная база:** `plans/ARCHITECTURE.md` — референс конвенций NestJS
(стек, структура модулей, DTO, Swagger, миграции, Docker). Этот план —
применение референса к домену TriKick. Следовать `ARCHITECTURE.md` как
источнику паттернов на всех шагах.

**Принцип плана:** максимальная переиспользуемость. Любая логика,
повторяющаяся между модулями, выносится в generic base-классы / фабрики /
mixin'ы. Каждый фича-модуль должен быть тонким — только специфика домена.

## Стек (ARCHITECTURE.md §1)

NestJS + Fastify · Sequelize 6 + sequelize-typescript · MySQL 8 ·
class-validator/transformer · Passport+JWT · Pino · Luxon · Lodash · Swagger.

---

## Монорепо: целевая структура

```
system-bussnes/
├── package.json                 # workspaces: apps/*, packages/*
├── packages/
│   └── shared/                  # @trikick/shared — общие типы и контракты
│       └── src/
│           ├── index.ts
│           ├── domain/          # student.ts, group.ts, training.ts,
│           │                    #   finance.ts, auth.ts
│           ├── enums/           # SubscriptionType, ClientPaymentType, …
│           └── api/             # ApiListResponse<T>, *Shape контракты
├── apps/
│   ├── frontend/                # существует
│   └── backend/                 # НОВЫЙ
└── plans/
```

---

## ПЕРЕИСПОЛЬЗУЕМОЕ ЯДРО (что строим в B1, наследуют все модули)

Чтобы фича-модули были тонкими, в `common/` создаём переиспользуемые блоки.
Каждый модуль домена наследует их, а не копирует.

### Я1. `BaseEntity` — базовая модель
Абстрактный класс sequelize-typescript: `id` (UUID, PK), `createdAt`,
`updatedAt`. Все модели `extends BaseEntity`.

### Я2. `OwnedEntity` — модель, принадлежащая пользователю
`extends BaseEntity` + `userId` (FK→users) + association `belongsTo User`.
Наследуют Group/Student/Training/Payment/HallCost — всё, что привязано к
тренеру. Гарантирует единообразную мультитенантность.

### Я3. `BaseCrudService<TModel>` — generic CRUD-сервис
Дженерик-класс с `create / findAll / findOne / update / remove`,
встроенной пагинацией/поиском/сортировкой (паттерн ARCHITECTURE.md §8,
вынесенный в переиспользуемую базу). Конкретный сервис:
```ts
@Injectable()
export class GroupService extends BaseCrudService<Group> {
  constructor(@InjectModel(Group) model: typeof Group) { super(model) }
  // только доменная специфика — остальное унаследовано
}
```

### Я4. `OwnedCrudService<TModel>` — CRUD с фильтром по userId
`extends BaseCrudService`, но все методы принимают `userId` и
автоматически фильтруют/проставляют его. Защита от доступа к чужим данным
на уровне сервиса. Наследуют сервисы всех owned-сущностей.

### Я5. `BaseCrudController` — generic-фабрика контроллера
Фабрика `createCrudController(options)`, возвращающая базовый thin-контроллер
с CRUD-маршрутами + Swagger. Модуль расширяет его доменными эндпоинтами.
(Если фабрика усложняет — допустимо оставить тонкие контроллеры по §7,
но CRUD-обвязку всё равно не дублировать.)

### Я6. Общие DTO
- `PaginationDto` / `PaginatedResponseDto` (ARCHITECTURE.md §5.7) — query и
  ответ списков.
- `IdParamDto` — валидация `:id` (UUID).
- `BaseResponseDto<T>` — generic-обёртка ответа.

### Я7. Глобальная обвязка
- `AllExceptionsFilter` — единый формат ошибок.
- `TransformInterceptor` — единый формат успешного ответа `{ data, success }`.
- `JwtAuthGuard` + `JwtStrategy` + `@CurrentUser()` — аутентификация.
- `DateUtil` (Luxon) — работа с датами.

### Я8. Swagger-композиты (ARCHITECTURE.md §6)
Переиспользуемые композитные декораторы: `@ApiCrudList()`,
`@ApiCrudItem()`, `@ApiAuth()` — собирают типовые наборы Swagger-декораторов.

### Я9. `packages/shared` — общие типы
Доменные интерфейсы — единственный источник правды. DTO бэка `implements`
их форму; фронт импортирует напрямую. Никакого дублирования.

---

## Модель данных (БД)

`User` — владелец данных (мультитенантность по тренеру). Вложенные массивы
фронта → отдельные таблицы. Все entity наследуют Я1/Я2.

| Таблица | Базовый класс | Ключевые поля |
|---------|---------------|---------------|
| users | BaseEntity | name, email UNIQUE, passwordHash |
| groups | OwnedEntity | name, schedule JSON, duration, isIndividual · UNIQUE(userId,name) |
| students | OwnedEntity | name |
| student_groups | — (M:N) | studentId, groupId · PK(оба) |
| subscriptions | BaseEntity | studentId, groupId, type ENUM, total, remaining, expiresAt, isActive, finPaymentId, sessionDuration |
| visits | BaseEntity | studentId, groupId, trainingId NULL, date |
| trainings | OwnedEntity | groupId, date, time, note, isPrime, sessionDuration, recurring, recurringId |
| training_attendees | — (M:N) | trainingId, studentId · PK(оба) |
| payments | OwnedEntity | studentId NULL, clientPaymentType ENUM, clientAmount, sessionsTotal/Remaining, paidAt, status, hallCostId NULL |
| hall_costs | OwnedEntity | studentId NULL, hallPaymentType ENUM, timeSlot ENUM, trainingTime, hallAmount, sessionsTotal/Remaining, paidAt, status |
| pricing | OwnedEntity | userId UNIQUE, data JSON |

**Связи:** User hasMany Group/Student/Training/Payment/HallCost, hasOne
Pricing · Student belongsToMany Group, hasMany Subscription/Visit · Group
hasMany Subscription/Training/Visit · Training belongsToMany Student,
hasMany Visit · Subscription belongsTo Payment · Payment hasOne HallCost.

---

## API — эндпоинты

Префикс `/api`. Всё кроме `/auth/*` — под `JwtAuthGuard`, фильтрация по
`userId`. CRUD-маршруты — из Я5; ниже перечислены доменные сверх CRUD.

```
POST /api/auth/register · /api/auth/login → {user,token} · GET /api/auth/me
CRUD /api/groups
CRUD /api/students  + /:id/subscriptions[/:sid/deduct|restore|extend]
CRUD /api/trainings + /recurring/:recurringId + /:id/attendees[/:studentId]
CRUD /api/finance/payments · /finance/hall-costs
GET/PUT /api/finance/pricing · GET /api/finance/stats
```

---

# ПОШАГОВЫЙ ПЛАН

Каждый шаг — атомарный, проверяемый. Не переходить к следующему, пока
текущий не собирается и не работает.

## Этап B0 — каркас монорепо

- **B0.1** Создать `packages/shared`: `package.json` (`@trikick/shared`),
  `tsconfig.json`, `src/index.ts`.
- **B0.2** Перенести доменные типы из фронта в `packages/shared/src/domain`
  (student, group, training, finance, auth) и `enums`.
- **B0.3** Описать в `packages/shared/src/api`: `ApiListResponse<T>`,
  `ApiError`, `*Shape`-контракты (Create/Update формы каждой сущности).
- **B0.4** Корневой `package.json` → workspaces `["apps/*", "packages/*"]`.
- **B0.5** Фронт: `entities/*/model/types.ts` → ре-экспорт из
  `@trikick/shared`. Проверить сборку фронта.
- **B0.6** `nest new apps/backend`, переключить на Fastify-адаптер.
- **B0.7** Подключить `@trikick/shared` в зависимости бэка, проверить импорт.
- **B0.8** `.env.example` + `.env`, `docker-compose.yml` с MySQL 8.
- **B0.9** `@nestjs/config` + `env.validation.ts` (валидация env при старте).
- **B0.10** Проверка: `nest start` поднимается, читает env.

## Этап B1 — переиспользуемое ядро (common)

- **B1.1** `database.config.ts` + `SequelizeModule.forRootAsync`, подключение
  к MySQL из docker-compose.
- **B1.2** **Я1** `BaseEntity` (UUID, timestamps).
- **B1.3** **Я2** `OwnedEntity` (`extends BaseEntity` + userId).
- **B1.4** **Я6** общие DTO: `PaginationDto`, `PaginatedResponseDto`,
  `IdParamDto`, `BaseResponseDto`.
- **B1.5** **Я7** `AllExceptionsFilter` + `TransformInterceptor`,
  подключить глобально в `main.ts`.
- **B1.6** **Я3** `BaseCrudService<TModel>` — generic CRUD с пагинацией.
- **B1.7** **Я4** `OwnedCrudService<TModel>` (`extends BaseCrudService`,
  фильтр по userId).
- **B1.8** **Я5** `BaseCrudController`-фабрика (или утвердить тонкий шаблон).
- **B1.9** **Я8** Swagger-композиты, настроить Swagger UI в `main.ts`.
- **B1.10** `DateUtil` (Luxon), Pino-логирование.
- **B1.11** Настроить `sequelize-cli` (`sequelize-cli.config.js`, скрипты
  миграций в `package.json`).
- **B1.12** Проверка: приложение стартует, Swagger UI открывается, ядро
  компилируется.

## Этап B2 — Auth + User

- **B2.1** `User`-модель (`extends BaseEntity`), миграция `users`.
- **B2.2** `users` модуль + сервис (поиск по email, создание).
- **B2.3** `auth` модуль: DTO register/login.
- **B2.4** `AuthService`: register (bcrypt-хеш), login (сверка), выпуск JWT.
- **B2.5** `JwtStrategy` + `JwtAuthGuard` + `@CurrentUser()` (Я7).
- **B2.6** `AuthController`: `POST /register`, `POST /login`, `GET /me`.
- **B2.7** Проверка через Swagger: регистрация → токен → `/me` с Bearer.

## Этап B3 — Group (обкатка паттерна модуля)

- **B3.1** `Group`-модель (`extends OwnedEntity`, `schedule` JSON), миграция.
- **B3.2** DTO Create/Update (`implements *Shape` из shared + декораторы).
- **B3.3** `GroupService extends OwnedCrudService<Group>` — только специфика
  (валидация уникальности имени, каскадная отвязка студентов при delete).
- **B3.4** `GroupController` — на базе Я5, доменные эндпоинты сверх CRUD.
- **B3.5** Swagger-композиты модуля.
- **B3.6** Проверка CRUD групп через Swagger под авторизацией.
- **B3.7** Зафиксировать паттерн модуля как образец для B4–B6.

## Этап B4 — Student + Subscription + Visit

- **B4.1** Модели `Student` (OwnedEntity), `Subscription`, `Visit`
  (BaseEntity); M:N `student_groups`. Миграции.
- **B4.2** Associations (Student↔Group, Student→Subscription, →Visit).
- **B4.3** DTO студента (Create/Update), DTO подписки.
- **B4.4** `StudentService extends OwnedCrudService<Student>`: CRUD +
  фильтры `group/status/search`, eager-load subscriptions/visits.
- **B4.5** `SubscriptionService`: add / deduct / restore / extend / delete /
  linkPayment — перенос логики `students.repo.ts` + `subscription-status.ts`.
- **B4.6** `StudentController`: CRUD + вложенные `/subscriptions/*`.
- **B4.7** Swagger-композиты.
- **B4.8** Проверка: создание студента, операции с абонементом через Swagger.

## Этап B5 — Training

- **B5.1** Модели `Training` (OwnedEntity), M:N `training_attendees`.
  Миграции.
- **B5.2** Associations (Training↔Student, Training→Visit).
- **B5.3** DTO тренировки (Create/Update), DTO attendees.
- **B5.4** `TrainingService extends OwnedCrudService<Training>`: CRUD,
  фильтр `from/to`.
- **B5.5** Доменная логика — перенос `training-logic.ts`: `markAttendance`
  (списание сессий + запись визитов в транзакции), проверка конфликтов,
  prime-time, recurring-серии.
- **B5.6** `TrainingController`: CRUD + `/recurring/:id` + `/attendees/*`.
- **B5.7** Swagger-композиты.
- **B5.8** Проверка: создание тренировки с посещаемостью, серия, конфликты.

## Этап B6 — Finance

- **B6.1** Модели `Payment`, `HallCost`, `Pricing` (OwnedEntity). Миграции.
- **B6.2** Associations (Payment↔HallCost, Subscription→Payment).
- **B6.3** DTO платежа / расхода зала / цен.
- **B6.4** `PaymentService` / `HallCostService extends OwnedCrudService` —
  CRUD + каскадное удаление hall_cost при удалении payment.
- **B6.5** `PricingService`: get / upsert (одна строка на userId).
- **B6.6** `FinanceStatsService`: агрегаты доход/расход/прибыль по периодам.
- **B6.7** Авто-платёж — перенос `auto-payment.ts` фронта в сервис.
- **B6.8** `FinanceController`: payments, hall-costs, pricing, stats.
- **B6.9** Swagger-композиты.
- **B6.10** Проверка всех финансовых эндпоинтов.

## Этап B7 — Сидер демо-данных

- **B7.1** `commands/seed` — CLI-команда (или Sequelize-сидер).
- **B7.2** Перенос `seed.ts` фронта: демо-тренер + группы + студенты +
  абонементы + тренировки + визиты.
- **B7.3** Проверка: `npm run seed` наполняет чистую БД.

## Этап B8 — Интеграция фронта

- **B8.1** `apiService` на фронте: HTTP-клиент (axios/fetch), базовый URL
  из env, прокидывание JWT в `Authorization`, обработка 401 → редирект login.
- **B8.2** `entities/auth/model/auth.repo.ts` → реальные вызовы
  `/auth/register|login|me`, хранение токена.
- **B8.3** `entities/groups/model/groups.repo.ts` → вызовы `/api/groups`.
- **B8.4** `entities/students/model/students.repo.ts` → `/api/students/*`.
- **B8.5** `entities/trainings/model/trainings.repo.ts` → `/api/trainings/*`.
- **B8.6** `entities/finance/model/finance.repo.ts` → `/api/finance/*`.
- **B8.7** Удалить `common/services/storage/*` (localStorage-слой) и
  `seedDemoData` из `main.tsx`.
- **B8.8** Проверка в браузере: полный цикл на реальном API, все 6 страниц.

## Конфигурация — .env (ARCHITECTURE.md §16)

```dotenv
NODE_ENV=development
PORT=3021
DB_HOST=localhost
DB_PORT=3306
DB_USER=trikick
DB_PASSWORD=trikick
DB_NAME=trikick
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3020
```
`.env.example` коммитится; `.env` валидируется при старте. Локальная MySQL —
через `docker-compose.yml`.

## Риски и решения

| Риск | Решение |
|------|---------|
| `id` строковые UUID на фронте | На бэке UUID (CHAR 36) — совместимо |
| Вложенные массивы → таблицы | Eager-load через Sequelize `include` |
| `schedule`/`pricing` — структуры | JSON-колонки MySQL 8 |
| Дублирование CRUD между модулями | Generic Я3-Я5 — модули наследуют |
| Дублирование логики абонементов | Источник правды — бэкенд |
| Расхождение типов фронт/бэк | `packages/shared` — единственный источник |
| Дублирование Swagger-декораторов | Композиты Я8 |
| Миграция данных пользователей | localStorage не мигрируем — сидер на бэке |

## Принцип реализации

1. B0-B1 — каркас и переиспользуемое ядро ДО первого модуля.
2. B2 (Auth) — раньше остальных, защита роутов зависит от него.
3. B3 (Group) — обкатка паттерна модуля, эталон для B4-B6.
4. Сущности от простой к сложной: Group → Student → Training → Finance.
5. Каждый модуль = тонкая надстройка над ядром Я1-Я8, не копия CRUD.
6. Каждый шаг проверяется через Swagger UI до перехода к следующему.
7. Интеграция фронта (B8) — последней, когда API стабилен.
8. `plans/ARCHITECTURE.md` — источник конвенций на всех шагах.

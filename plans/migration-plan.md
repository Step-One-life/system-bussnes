# План миграции TriKick: legacy → apps/frontend

## Контекст

`legacy/` — рабочее приложение «TriKick» (менеджер тренировок) на ванильном JS,
~9000 строк. Цель — перенести его в `apps/frontend` (React 19 + TS + Vite) с
соблюдением конвенций из `plans/default.md` (lodash, структура entities,
Ant Design, i18n, TanStack Query).

### Что есть в legacy

| Файл | Строк | Роль |
|------|-------|------|
| `data.js` | 899 | Слой данных — localStorage CRUD, всё async (под будущий API) |
| `logic.js` | 444 | Бизнес-логика — статусы абонементов, KPI, конфликты, форматирование |
| `ui.js` | 1142 | Рендер HTML-строк, тосты/модалки/drawer |
| `app.js` | 3336 | Роутинг, инициализация страниц, делегирование событий |
| `style.css` | 2987 | Все стили, CSS-переменные, темизация (dark/light) |
| `index.html` | 128 | App shell — sidebar, bottom-nav, контейнеры модалок |

### Доменная модель (сущности)

- **Student** — ученик: `{ id, name, groups[], subscriptions[], visitHistory[], createdAt }`
- **Subscription** (вложена в Student) — `{ id, groupId, type, total, remaining, createdAt, expiresAt, isActive, finPaymentId, sessionDuration }`
- **Group** — группа: `{ id, name, schedule[{day,time}], duration, isIndividual, createdAt }`
- **Training** — тренировка: `{ id, date, time, groupId, attendees[], note, isPrime, sessionDuration, recurring, recurringId, createdAt }`
- **Payment** — оплата клиента (Финансы, Поток 1)
- **HallCost** — оплата зала (Финансы, Поток 2)
- **Pricing** — конфиг цен (Финансы)

### Страницы (6)

1. **Home** — KPI-карточки, предупреждения, «отметить сегодня»
2. **Trainings** — календарь/список тренировок, конфликты, повторяющиеся
3. **Students** — список с фильтрами, drawer с деталями
4. **Individual** — индивидуальные занятия (отдельные KPI/warnings)
5. **Groups** — карточки групп, статистика, детали
6. **Finance** — записи (платежи/зал), цены, статистика, графики (Chart.js)

### Ключевые внешние зависимости legacy

- **Lucide** (иконки) → заменить на `@ant-design/icons` или `lucide-react`
- **Chart.js** → `recharts` или оставить `chart.js` + `react-chartjs-2`
- **Satoshi** (шрифт) → подключить через CSS
- **localStorage** — слой `DB` уже async, маппится на API позже

---

## Целевая структура `apps/frontend/src`

```
src/
├── main.tsx
├── App.tsx                      # роутер + layout
├── app/
│   ├── layout/                  # Sidebar, BottomNav, app shell
│   ├── providers/               # QueryClientProvider, ThemeProvider, AntdConfig
│   └── routes.tsx
├── common/
│   ├── services/
│   │   ├── storage/             # порт DB-слоя (localStorage adapter)
│   │   └── api/                 # заготовка под будущий REST API
│   ├── ui/                      # обёртки: Toast, Modal, Drawer, EmptyState
│   ├── hooks/
│   └── utils/                   # форматтеры дат, isPrimeTime, конфликты
├── entities/
│   ├── students/                # list / form / details / subscriptions
│   ├── groups/                  # list / form / details
│   ├── trainings/               # list / calendar / form
│   └── finance/                 # payments / hall-costs / pricing / stats
├── pages/
│   ├── home/
│   ├── trainings/
│   ├── students/
│   ├── individual/
│   ├── groups/
│   └── finance/
└── locales/
    ├── ru/translation.json
    └── en/translation.json
```

---

## Этапы

### Этап 0 — Инфраструктура и зависимости
- [ ] Установить: `react-router-dom`, `antd`, `@ant-design/icons`,
      `@tanstack/react-query`, `lodash` + `@types/lodash`,
      `i18next` + `react-i18next`, `chart.js` + `react-chartjs-2`,
      `dayjs` (даты).
- [ ] Настроить ESLint + Prettier по правилам `plans/default.md`
      (порядок импортов, kebab-case файлов).
- [ ] Алиасы путей в `tsconfig` + `vite.config` (`entities/*`, `common/*`, `pages/*`).
- [ ] Подключить шрифт Satoshi, перенести CSS-переменные/темы из `style.css`
      в `src/app/theme` (токены Ant Design + CSS-vars).
- [ ] Каркас: `QueryClientProvider`, `ConfigProvider` (antd), `i18n`, роутер.

### Этап 1 — Доменные типы и слой данных
- [ ] Описать TS-интерфейсы всех сущностей в `entities/*/.../models.ts`
      (Student, Subscription, Group, Training, Payment, HallCost, Pricing).
- [ ] Перенести `data.js` → `common/services/storage`:
      типизированный localStorage-адаптер, сохранить async-сигнатуры
      и логику миграций схемы (`getGroups` migration heuristics).
- [ ] Перенести `logic.js` → `common/utils` + `entities/*/lib`:
      `getSubStatus`, `getSubProgress`, `getKPIs`, `checkTrainingConflict`,
      `isPrimeTime`, форматтеры дат (на `dayjs`).
- [ ] Обернуть доступ к данным в TanStack Query хуки
      (`useStudents`, `useGroups`, `useTrainings`, `usePayments` …)
      с query keys по конвенции (`['students','all']` и т.д.).
- [ ] Сидинг демо-данных (`seedDemoData`) — dev-only хук.

### Этап 2 — Общие UI-примитивы
- [ ] `Toast` → antd `message`/`notification` обёртка.
- [ ] `Modal` / `Drawer` → antd компоненты (заменяют ручные overlay).
- [ ] `EmptyState`, `Badge` (статусы), `ProgressBar` абонемента, `KpiCard`.
- [ ] Layout: `Sidebar` (desktop), `BottomNav` (mobile), переключатель темы.
- [ ] Роутинг 6 страниц + активные nav-состояния.

### Этап 3 — Сущность Groups (самая простая, первая для проверки паттерна)
- [ ] `entities/groups`: list (карточки + статистика), form (создание/редактирование,
      расписание по дням), details.
- [ ] Страница `pages/groups`.
- [ ] Проверить паттерн entity на одной сущности перед остальными.

### Этап 4 — Сущность Students + Subscriptions
- [ ] `entities/students`: list (таблица desktop + карточки mobile), фильтры
      (группа/статус/поиск), form (создание/редактирование), details (drawer).
- [ ] Подсущность `subscriptions`: продление, списание занятия, новый абонемент,
      продление срока, удаление; история посещений.
- [ ] Страница `pages/students`.

### Этап 5 — Сущность Trainings
- [ ] `entities/trainings`: list + calendar (недельный вид), form (создание,
      выбор группы/учеников, проверка конфликтов, prime-time подсказка),
      повторяющиеся серии (recurring), добавление ученика в тренировку.
- [ ] Страница `pages/trainings`.
- [ ] Страница `pages/individual` (индивидуальные занятия — переиспользует
      trainings + отдельные KPI/warnings из `logic.js`).
- [ ] Логика отметки посещаемости (`markAttendance`) с побочными эффектами
      (списание сессий, запись визитов).

### Этап 6 — Home
- [ ] `pages/home`: KPI-сетка с count-up анимацией, модалки деталей KPI,
      список предупреждений, «отметить сегодня».

### Этап 7 — Сущность Finance
- [ ] `entities/finance`: payments (платежи клиентов), hall-costs (оплата зала),
      pricing (конфиг цен), stats (агрегаты).
- [ ] Страница `pages/finance`: вкладки записи/цены/статистика.
- [ ] Графики на `react-chartjs-2` (перенос с Chart.js).
- [ ] Связи: оплата ↔ абонемент, авто-расход зала при создании абонемента
      (логика из последних коммитов legacy).

### Этап 8 — i18n, полировка, проверка
- [ ] Все тексты → `t('key')`, заполнить `ru` + `en` переводы.
- [ ] Сверка с legacy: пройти все 6 страниц в браузере, сравнить поведение.
- [ ] Адаптив (desktop/mobile), темизация dark/light.
- [ ] Удалить `lucide`/`chart.js` CDN-зависимости.

---

## Риски и решения

| Риск | Решение |
|------|---------|
| HTML-строки → JSX: 1142 строки `ui.js` переписать вручную | Делать поэтапно по сущностям, не разом |
| `app.js` 3336 строк — связанная логика и роутинг | Разбивать по страницам/сущностям, логику в хуки (≤200-300 строк/файл) |
| Миграции схемы данных в `getGroups` | Сохранить как есть в storage-адаптере — данные пользователей в localStorage |
| `chart.js` глобал → React | `react-chartjs-2` обёртка |
| Event delegation → React-обработчики | Переписать на пропсы/коллбэки |
| Потеря данных пользователя | Ключи localStorage (`tk_*`) НЕ менять — совместимость со старыми данными |

## Порядок и принцип

1. Сначала инфраструктура (этапы 0-2) — без неё ничего не собрать.
2. Затем сущности от простой к сложной: Groups → Students → Trainings → Finance.
3. Каждая сущность — вертикальный срез (данные + UI + страница), проверяется
   в браузере против legacy до перехода к следующей.
4. Legacy остаётся рабочим эталоном до завершения этапа 8.

# Безлимитный абонемент — дизайн (Задача 3)

> Дата: 2026-06-18. Часть 3 из 3 (после кастомных и парных абонементов).
> Решение пользователя: цена и срок — **из тарифа** (новый формат «Безлимит»).

## Идея
Абонемент с сроком годности, но без счётчика занятий: показывает «Безлимит», при отметке
**засчитывается** (`billing=subscription`, чтобы не уходить в авто-платёж и видеть историю),
но число занятий НЕ списывается. По истечении срока — перестаёт действовать (как обычный).

## Подход (по образцу `isPair` из задачи 2)

### 1. Модель
- Миграция: `subscriptions.is_unlimited` BOOLEAN NOT NULL DEFAULT false.
- `subscription.model.ts` + shared `CreateSubscriptionShape` + DTO + фронт `Subscription`/`SubscriptionInput`:
  `isUnlimited?: boolean`.
- `SubscriptionsService.add`: `isUnlimited: data.isUnlimited ?? false`. Для безлимита `total`/`remaining`
  смысла не имеют — пишем 0 (или 1); авторитетен флаг.

### 2. Тариф «Безлимит»
- `PricingFormat` += `'unlimited'` (shared enums + фронт types). Тариф: `lessonKind` + `format='unlimited'`
  + `validity_days` + `client_price`/prime; `sessions_count` не используется (0/1).
- Форма тарифа (`pricing-config` `PRICING_FORMATS`, `rule-form`/`rule-params`): добавить формат;
  при «Безлимит» скрыть/игнорировать «число занятий». Отображение строки тарифа — «Безлимит · срок N дн».

### 3. Списание — НЕ уменьшать число (ключевое)
- `pickSubForDeduct`: безлимит участвует наравне (по группе/сроку). **Приоритет**: сначала
  считаемые абонементы (чтобы пакеты расходовались), затем безлимит — добавить как последний выбор.
- `SubscriptionsService.deduct`: после выбора — `if (sub.isUnlimited) { status='ok' (или 'ending' по сроку),
  НЕ трогаем remaining/isActive } else { как сейчас }`. billing='subscription', subscriptionId записывается.
- `restoreById`/`restore` (откат отметки): для безлимита ничего не возвращаем (нечего).
- Фронт-зеркало `findSubForGroup` — тот же приоритет (безлимит последним), без влияния на отметку.

### 4. Срок и статусы
- `expiresAt` уже есть (createdAt + validity_days). Истёкший безлимит не выбирается (фильтр isNotExpired) →
  отметка уходит в авто-платёж.
- `getSubStatus`/`getDaysRemaining`: для безлимита статус по СРОКУ (не по remaining) — «Активен» / «Заканчивается»
  (≤7 дн) / «Истёк».

### 5. Отображение
- `subLabel`: для безлимита — «Безлимит» (вместо «N занятий»); 90-мин/пара-маркеры применимы.
- `SubProgressBar`/`sub-card`: вместо «remaining/total занятий» показать «Безлимит · до DD.MM»;
  прогресс-бар полный (или скрыть шкалу). `getSubProgress`: для безлимита pct=100/особый класс.

### 6. Доход
- Тип `'unlimited_subscription'` (`ClientPaymentType` shared+фронт; DTO `CLIENT_TYPES`/`HALL_TYPES`;
  `clientTypeToTuple`; `tuplePaymentType`: format 'unlimited' → 'unlimited_subscription'; локали).
  Сумма из тарифа; `sessionsTotal` = 0/1 (не значимо).

### 7. Выдача
- Безлимит-тарифы появляются в том же списке выдачи (`AddSubModal`/`RenewSubModal`) — это тарифы
  группы с `format='unlimited'`. При выборе: `type='sub'`, `isUnlimited=true`, total=0, цена/срок из тарифа.
- `subTuple`: учесть `format='unlimited'` (по флагу isUnlimited абонемента → tuple.format='unlimited').

## Затрагиваемые файлы (чек-лист «N мест»)
- БД/бэк: миграция `*-add-subscriptions-is-unlimited.js`; `subscription.model`; DTO `create-subscription`;
  `subscriptions.service` (add/deduct/restore); `lib/pick-subscription` (+spec — приоритет безлимита последним);
  finance DTO `create-payment`/`create-hall-cost` (+`unlimited_subscription`); training не меняем (deduct сам решает).
- shared: `enums` (PricingFormat +'unlimited', ClientPaymentType +'unlimited_subscription'); `api/shapes` (isUnlimited).
- фронт типы: `students/model/types` (isUnlimited), `finance/model/types` (PricingFormat, ClientPaymentType).
- фронт логика: `students.repo` (isUnlimited); `subscription-status` (subLabel/getSubStatus/getSubProgress/findSubForGroup приоритет);
  `subscriptions/sub-tuple` (format unlimited); `finance/lib/auto-payment` (tuplePaymentType); `finance/lib/rule-match` (clientTypeToTuple);
  `finance/pricing/pricing-config` (+формат), `rule-form`/`rule-params` (скрыть число занятий при безлимите).
- фронт UI: `sub-card`/`sub-progress-bar` (отображение безлимита); локали ru/en.

## Не трогаем
- Считаемые/парные/кастомные абонементы (задачи 1–2) — флаг isUnlimited их не задевает.
- Авто-платёж разового при отсутствии/истечении абонемента — как прежде.

## Тесты / гейт
- jest: `pick-subscription.spec` — безлимит выбирается последним (считаемый приоритетнее); истёкший безлимит не выбирается.
- vitest: `sub-tuple` — кейс unlimited; subLabel «Безлимит».
- Гейт: миграция → shared → backend → jest → frontend → eslint → vitest.
- Живой API-e2e: выдать безлимит (isUnlimited, срок) → 2 отметки в группе → billing='subscription' оба раза,
  remaining НЕ меняется; считаемый абонемент приоритетнее безлимита; истёкший безлимит → авто-платёж.

## Риски
- Списание без декремента — главный момент; покрыть тестом deduct/pick (приоритет + не-декремент).
- Ловушка «N мест» для PricingFormat 'unlimited' и типа дохода 'unlimited_subscription' (DTO-валидация — как поймали в задаче 2).
- Отображение: не делить на total=0 в прогресс-баре (защитить).

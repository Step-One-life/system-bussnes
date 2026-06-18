# Парные абонементы — дизайн (Задача 2)

> Дата: 2026-06-18. Часть 2 из 3 (после кастомных абонементов; далее — безлимит).
> Решение пользователя: **у каждого ученика свой парный абонемент** (свой баланс).

## Контекст и проблема

Парные (сплит) тренировки сейчас — только разовые: цена/зал «на одного», тип `single_pair`.
- `attendance-pricing.ts:43` — парная отметка всегда даёт `single_pair`/`single_pair_90`.
- `training.service.ts:316` — `if (!training.isPair)`: для парных **списание абонемента
  пропускается целиком**, поэтому каждая отметка уходит в авто-платёж.
- Парные/индивидуальные/онлайн висят на одной скрытой группе-контейнере. Списание
  (`pickSubForDeduct` по `groupId`+длительности) НЕ различает «парный» и «индивидуальный»
  абонемент — без признака они бы конфликтовали.

Нужно: дать каждому ученику парный абонемент, который списывается при отметке парного
занятия; нет абонемента → разовый платёж (как сейчас).

## Подход

Парный абонемент — обычный `Subscription` с **признаком `isPair`** (новая колонка), что
позволяет списанию выбирать именно парный для парных тренировок (и не трогать его на
индивидуальных). Число занятий/цена/срок — из тарифа (переиспользуем декуплинг Задачи 1).

### 1. Схема и модель
- Миграция: `subscriptions.is_pair` BOOLEAN NOT NULL DEFAULT false.
- `subscription.model.ts`: `@Column({ field: 'is_pair', ... }) declare isPair: boolean`.
- shared `CreateSubscriptionShape` + DTO + фронт `SubscriptionInput`/`Subscription`: `isPair?: boolean`.
- `SubscriptionsService.add`: `isPair: data.isPair ?? false`.

### 2. Списание различает парный/индивидуальный
- `PickableSub` += `isPair: boolean`; `pickSubForDeduct(subs, groupId, duration, today, wantPair)`
  — пул фильтруется по `s.isPair === wantPair` (помимо срока). Так парная отметка списывает
  только парные абонементы, индивидуальная — только не-парные.
- `SubscriptionsService.deduct(... , wantPair)` и `findActiveOrLatest`/`restore` — прокинуть `wantPair`.
- Фронт-зеркало `findSubForGroup` (`subscription-status.ts`) — тот же фильтр по `isPair`.

### 3. markAttendance: снять жёсткий гейт парных
- `training.service.ts:316`: убрать `if (!training.isPair)`. Всегда звать `deduct(..., wantPair=training.isPair)`.
  Если парный абонемент найден → `billing='subscription'` (как у обычных). Если нет → текущий
  путь `single_pair` авто-платёж сохраняется (билет «none» → createAttendancePayment).
- `attendance-pricing.ts` — без изменений (фолбэк-тариф `single_pair` остаётся для случая «нет абонемента»).
- Откат отметки (`revertVisit`/`restoreById`) уже точечный по `subscriptionId` — парные не требуют спец-логики.

### 4. Тарифы: парный абонемент
- Форма тарифа уже допускает `lessonKind='pair'` (LESSON_KINDS) и `format` (single/subscription).
  Проверить, что пара `pair`+`subscription` не блокируется в `use-rule-form`/`rule-params`; если
  блокируется — снять ограничение. Парный абонемент-тариф — цена «на одного».
- `subTuple` (Задача 1) расширить: для парного абонемента возвращать `lessonKind: 'pair'`
  (новый аргумент/признак isPair), чтобы резолв цены/продление работали.
- Доход за парный абонемент: обобщённый тип. Добавить `pair_subscription` в `ClientPaymentType`
  (+ `tuplePaymentType`: pair+subscription → `pair_subscription`; локали). Списание число занятий
  через `sessionsTotal` (как в Задаче 1).

### 5. Выдача (UI) — где оформить парный абонемент
Парные живут на индивидуальном контейнере, своей группы нет. По аналогии с индивидуальными
(их абонемент создаётся в потоке `use-individual-session`), парный абонемент выдаём в потоке
**парной сессии** (`use-pair-session`/`pair-session-modal`): при создании парной тренировки —
опция «оформить абонемент» для каждого из двух учеников (тариф `pair`+`subscription`, `isPair=true`).
Альтернатива/дополнение — пункт в карточке ученика. (Точку входа подтвердить на ревью.)
- Карточки абонементов (`sub-card`/drawer): помечать парный бейджем «Пара»; `subLabel` уже по числу.

## Затрагиваемые файлы (чек-лист)
- БД/бэк: миграция `*-add-subscriptions-is-pair.js`; `subscription.model.ts`;
  `student/dto/create-subscription.dto.ts`; `subscriptions.service.ts` (add/deduct/restore/findActiveOrLatest);
  `lib/pick-subscription.ts` (+spec); `training/training.service.ts` (снять гейт, прокинуть wantPair).
- shared: `api/shapes.ts` (`isPair`); `enums/index.ts` (+`pair_subscription`).
- фронт типы: `students/model/types.ts` (`Subscription.isPair`, `SubscriptionInput.isPair`);
  `finance/model/types.ts` (+`pair_subscription`).
- фронт логика: `students.repo` (проброс isPair); `subscription-status.ts` (`findSubForGroup` фильтр isPair);
  `subscriptions/sub-tuple.ts` (pair lessonKind); `finance/lib/auto-payment.ts` (`tuplePaymentType` pair);
  `finance/lib/rule-match.ts` (`clientTypeToTuple` +`pair_subscription`).
- фронт UI: `use-pair-session.ts`/`pair-session-modal.tsx` (выдача парного абонемента);
  `sub-card`/`shared-sub-card` (бейдж «Пара»); локали ru/en (`pair_subscription`, бейдж).

## Не трогаем
- Разовые парные (нет абонемента) — поведение прежнее (`single_pair` авто-платёж).
- Кастомные/групповые/индивидуальные абонементы (Задача 1) — фильтр `isPair=false` их не задевает.
- Безлимит — Задача 3.

## Тесты / гейт
- jest: `pick-subscription.spec.ts` — парный пул (wantPair=true берёт только isPair, не трогает индивидуальные; и наоборот).
- vitest: `sub-tuple` — кейс pair.
- Гейт: миграция → shared → backend → jest → frontend → eslint → vitest.
- Живой API-e2e: выдать парный абонемент (isPair, sessionsTotal=N) → отметить парную тренировку →
  списалось у каждого по 1, billing='subscription'; без парного абонемента → single_pair авто-платёж;
  индивидуальный абонемент парной отметкой НЕ списывается.

## Риски
- Миграция (новая колонка) — обязательна перед бэком.
- Различение isPair в списании — главный источник ошибок; покрыть тестом pick-subscription.
- Ловушка «N мест» для нового типа дохода `pair_subscription` (как в Задаче 1).
- Откат и идемпотентность отметки — переиспользуют существующие транзакции/UNIQUE; парные не меняют контракт.

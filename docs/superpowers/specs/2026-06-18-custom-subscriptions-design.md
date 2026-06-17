# Кастомные абонементы при выдаче ученику — дизайн (Задача 1)

> Дата: 2026-06-18. Часть 1 из 3 (далее: парные абонементы, безлимит — отдельными спеками).

## Контекст и проблема

Тренер может создать тариф-абонемент на любое число занятий (в форме тарифа есть
пресеты 1/4/8 **и «своё»** со свободным вводом — `preset-picker.tsx`). Но при **выдаче**
абонемента ученику список вариантов захардкожен:

- `add-sub-modal.tsx:35` — `const SUB_TYPES: SubscriptionType[] = ['1', '4', '8']`.
- Тип абонемента — жёсткое перечисление `SubscriptionType` (`'1'|'4'|'8'|…`), число
  занятий берётся из фикс-таблицы `SUB_TYPE_TOTALS` (`subscription-totals.ts`) — всегда 1/4/8.

Итог: групповой абонемент на 6/7/12 занятий, заведённый в тарифах, **не появляется** при
оформлении ученика. Решение (согласовано с пользователем): **список абонементов строить из
тарифов-абонементов тренера**; число занятий, цена и срок — из выбранного тарифа.

## Ключевой инсайт (почему это декуплинг, а не переписывание)

- **Сопоставление тарифа идёт по кортежу** `{ lessonKind, format, durationMinutes, sessionsCount }`
  (`matchRule` в `rule-match.ts`), а НЕ по `SubscriptionType`/`ClientPaymentType`. Значит любое
  число занятий тариф уже матчит.
- **`Subscription.total` — свободная числовая колонка** (`subscription.model`), просто
  заполняется из `SUB_TYPE_TOTALS[type]`. Списание/срок/отображение уже работают с
  произвольным `total`/`remaining`.
- Единственные жёсткие места: (1) хардкод-список в UI, (2) вывод `total` из `type` в
  `add()`, (3) «ярлык» дохода — `ClientPaymentType` не имеет значения для произвольного числа.

## Подход

Абонемент при выдаче описывается **выбранным тарифом** (PricingRule, `format='subscription'`).
Из тарифа берём: `sessionsCount → total`, `durationMinutes → sessionDuration`, цену, `validity_days`.

### 1. Явное число занятий вместо вывода из типа
- `CreateSubscriptionShape` (shared) + `CreateSubscriptionDto` (бэк) + `SubscriptionInput`
  (фронт): добавить `sessionsTotal?: number`.
- `SubscriptionsService.add`: `const total = data.sessionsTotal ?? SUB_TYPE_TOTALS[data.type] ?? 1`
  (обратная совместимость — старые вызовы без `sessionsTotal` работают как раньше).
- `sessionDuration` брать из тарифа (а не всегда 60).

### 2. Тип/ярлык абонемента — по числу, а не по фикс-перечислению
- Метка абонемента в UI выводится из `total`/`format`: «N занятий» / «Разовое посещение»
  (вместо `students.subTypes.type_${type}`). Добавить i18n-ключ с интерполяцией
  `students.subTypes.sessions` = «{{count}} занятий» (плюрализация ru/en).
- Цену для отображения и продления резолвить **по кортежу из самого абонемента**, а не из `type`:
  новый чистый хелпер `subTupleFromSub(sub, group)` → `{ lessonKind, format, durationMinutes, sessionsCount, timeSlot }`,
  где `lessonKind` из группы (individual/group/shared), `format = total>1 ? 'subscription' : 'single'`,
  `durationMinutes = sub.sessionDuration`, `sessionsCount = sub.total`. Заменяет `subTypeToTuple(type)`
  для произвольных абонементов; для пресетов 1/4/8 кортеж совпадает (регрессии нет).
- `SubscriptionType` оставляем как есть; для кастомных передаём ближайший back-compat `type`
  (`'1'` при total=1, иначе общий маркер) — **`total` авторитетен**, `type` больше не источник числа.

### 3. Доход за кастомный абонемент — обобщённый тип платежа + явное число
- Добавить в `ClientPaymentType` обобщённые значения: `'group_subscription'`,
  `'individual_subscription'` (на парные/онлайн распространим в Задаче 2). Они НЕ имеют
  фиксированного числа занятий.
- `CreatePaymentShape`/DTO: добавить `sessionsTotal?: number`. Бэк `payments.service` (и
  `hall-costs.service`): `const sessions = dto.sessionsTotal ?? FIN_SESSIONS[dto.clientPaymentType] ?? 1`.
- `autoCreatePayment`: при tariff-driven выдаче использовать уже выбранный тариф (цена известна),
  писать обобщённый `client_payment_type` + `sessionsTotal = total`. Для пресетов 1/4/8 поведение
  не меняем (точные типы остаются валидны).
- i18n: `finance.types.group_subscription` = «Абонемент (группа)», `…individual_subscription`
  = «Абонемент (инд.)» (ru/en). В списке «Записи» дохода показывать «… · N занятий».

### 4. UI выдачи — список из тарифов (две точки входа)
- **`AddSubModal`** («Добавить абонемент»): после выбора группы(групп) и слота — селект
  вариантов строится из тарифов локации группы: `format='subscription'` (+ `single` как
  «Разовое») для `lessonKind` группы (individual / group / shared при нескольких группах).
  Каждый вариант: «N занятий · цена ₽», `value` = тариф (id/кортеж). Submit передаёт
  `sessionsTotal`, `sessionDuration`, цену.
- **`RenewSubModal`** в режиме `issueMode` (оформление без прошлого абонемента): сейчас тип
  фиксирован «разовое». Добавить такой же выбор тарифа. Режим продления (`prevSub`) — оставить
  «как прошлый», но цену/число резолвить через `subTupleFromSub` (на случай, если прошлый —
  кастомный).

## Затрагиваемые файлы (чек-лист «N мест», ARCHITECTURE §8)
- shared: `enums/index.ts` (+2 `ClientPaymentType`), `api/shapes.ts` (`CreateSubscriptionShape.sessionsTotal`,
  `CreatePaymentShape.sessionsTotal`).
- backend: `student/dto/create-subscription.dto.ts` (+`sessionsTotal`), `student/subscriptions.service.ts`
  (`add` total/duration), `finance/dto/create-payment.dto.ts` (+`sessionsTotal`, +2 типа в `CLIENT_TYPES`),
  `finance/payments.service.ts` + `finance/hall-costs.service.ts` (sessions из `sessionsTotal`),
  `finance/finance.constants.ts` (по необходимости).
- frontend types-дубли: `entities/finance/model/types.ts` (`ClientPaymentType`),
  `entities/students/model/types.ts` (`SubscriptionInput.sessionsTotal`).
- frontend logic: `finance/lib/auto-payment.ts` (обобщённый путь + sessionsTotal),
  `finance/model/finance-constants.ts` (`FIN_SESSIONS` — без жёсткого значения для обобщённых),
  новый чистый `students/subscriptions/sub-tuple.ts` (`subTupleFromSub`) + vitest.
- frontend UI: `add-sub-modal.tsx`, `renew-sub-modal.tsx`, `students.repo` (проброс `sessionsTotal`).
- locales ru/en: `students.subTypes.sessions`, `finance.types.group_subscription/individual_subscription`.

## Не трогаем
- `use-individual-session.ts` (`SUB_TYPE_TOTALS` для repeatCount серии) — отдельный поток,
  пресеты там остаются.
- Списание (`deduct`/`pick-subscription`), срок, статусы — уже на `total`/`remaining`.
- Парные/онлайн абонементы и безлимит — Задачи 2 и 3.

## Тесты / гейт
- vitest: `sub-tuple.spec.ts` (кортеж из абонемента: group/individual/shared, single vs subscription,
  duration, count); метка «N занятий».
- jest (бэк): чистых функций нет (логика в сервисе); проверяется сборкой.
- Гейт: build shared → build backend → jest → build frontend → eslint → vitest.
- Живой e2e (API, demo): создать тариф group/subscription/60/7 → выдать абонемент ученику с
  `sessionsTotal=7` → проверить `total=7`, доход записан с числом 7 и обобщённым типом; пресеты
  1/4/8 не регрессировали.

## Риски
- «N мест»: пропустить точку → валидация/ярлык дохода ломается. Митигация — чек-лист выше + гейт.
- Обратная совместимость старых абонементов (`type` '4'/'8', `total` заполнен) — `subTupleFromSub`
  даёт тот же кортеж; UI-метка перейдёт на «N занятий» (косметика, не регресс данных).
- Обобщённый тип платежа в статистике: `FIN_SESSIONS` fallback `?? 1` для него неверен — поэтому
  обязателен явный `sessionsTotal` на платеже.

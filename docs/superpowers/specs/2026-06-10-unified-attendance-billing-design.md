# Единая отметка ⇄ деньги на бэкенде — дизайн

Дата: 2026-06-10. Ветка: `feat/unified-attendance-billing`.

## Проблема

Логика «отметка посещения ⇄ деньги» размазана по фронту в нескольких копиях:

1. Авто-платёж при отметке создаётся только в модалке «Отметить сегодня»
   (`use-mark-today.ts` → `markAttendanceWithPayment`). Остальные точки отметки —
   детали занятия в календаре (`use-calendar-training.ts`), «Добавить к тренировке»
   (`use-add-to-training.ts`), создание групповой с отметками (`use-group-training.ts`) —
   зовут голый `markAttendance` **без оплаты**. Парное занятие, отмеченное из
   календаря, проходит бесплатно (бэк абонемент не списывает при `isPair`, платёж
   не создаётся).
2. Снятие отметки (`training.service.ts: removeAttendee`) вызывает `restore`
   безусловно, хотя списания могло не быть (парное; разовый клиент с платежом).
   `restore` через `findActiveOrLatest` находит и **неактивные** абонементы и
   реактивирует их → снятие отметки «дарит» занятия.
3. Авто-платёж не связан с тренировкой: снятие отметки его не удаляет, повторная
   отметка создаёт дубль.
4. Фронтовые проверки активного абонемента игнорируют общие абонементы
   (`groupIds`) → бэк списывает с общего, фронт параллельно создаёт разовый
   платёж = двойное удержание.
5. `use-calendar-training.saveAttendance` дублирует запись attendees
   (`markAttendance` + `updateTraining({attendees})` поверх) и откатывает вручную
   тремя вызовами (`restoreSession` безусловно + `removeVisit` + `updateTraining`).

## Решение (подход «визит помнит, чем оплачен»)

Вся денежная логика отметки переезжает в `training.service.markAttendance` /
`removeAttendee` на бэке. Каждый визит записывает результат биллинга; откат
читает визит и отменяет ровно то, что было сделано. Все точки UI ходят в одни
эндпоинты `POST /trainings/:id/attendees` и `DELETE /trainings/:id/attendees/:studentId`.

### Утверждённые продуктовые решения

- **Откат оплаты:** снятие отметки автоматически удаляет авто-платёж и связанный
  расход зала. Платежи, созданные вручную в разделе Финансы, не трогаются
  (они не привязаны к визиту).
- **Нет тарифа:** отметка сохраняется, платёж не создаётся, бэк возвращает флаг,
  UI показывает предупреждение «Нет тарифа — платёж не записан».
- **Объём:** все 4 точки отметки переводятся сразу. Предоплата абонемента при
  покупке (`use-individual-session.ts`, `auto-payment.ts`) — вне объёма, не трогаем.

## 1. Модель данных

Миграция `add-billing-to-visits`: в таблицу `visits` добавляются

| Колонка | Тип | Семантика |
|---|---|---|
| `billing` | STRING, NULL | `'subscription'` — списан абонемент; `'payment'` — создан платёж; `'none'` — ничего (нет тарифа / сидер); `NULL` — легаси-визит до миграции |
| `subscription_id` | UUID, NULL | id списанного абонемента (при `'subscription'`) |
| `payment_id` | UUID, NULL | id созданного платежа (при `'payment'`) |

Существующие строки остаются `NULL` — для них откат работает по старой эвристике
(`restore` c `findActiveOrLatest`), поведение старых данных не меняется.
Таблица `payments` не меняется: связь платёж↔посещение живёт на визите.

`visit.model.ts` дополняется полями `billing`, `subscriptionId`, `paymentId`.

## 2. Чистая функция резолва тарифа: `training/lib/attendance-pricing.ts`

Вход: `{ isPair, isOnline, sessionDuration }` тренировки + `{ isIndividual }` группы.
Выход: `{ tuples: RuleTuple[], paymentType: ClientPaymentType }`, где
`RuleTuple = { lessonKind, format: 'single', durationMinutes, sessionsCount: 1 }`.
`tuples` — упорядоченный список попыток поиска (для онлайна их две).

Маппинг (зеркало фронтового `markAttendanceWithPayment` + `subPaymentType` +
`subTypeToTuple`, включая историческую особенность «группа 90 мин → индивидуальный
разовый тариф»):

| Тренировка | tuples (lessonKind/duration) | paymentType |
|---|---|---|
| парная 60 | `pair/60` | `single_pair` |
| парная 90 | `pair/90` | `single_pair_90` |
| онлайн 60 | `online/60` → `individual/60` | `single_individual` |
| онлайн 90 | `online/90` → `individual/90` | `single_individual_90` |
| индивидуальная 60 | `individual/60` | `single_individual` |
| индивидуальная 90 | `individual/90` | `single_individual_90` |
| групповая 60 | `group/60` | `single_group` |
| групповая 90 | `individual/90` | `single_individual_90` |

Покрывается jest-тестами (вся матрица).

## 3. Отметка: `markAttendance(training, studentIds)`

Для каждого ученика по порядку:

1. **Идемпотентность.** Существует визит на (`trainingId`, `studentId`) → ученик
   пропускается целиком (ни списания, ни платежа, ни второго визита). Лечит дубли
   при переотметке.
2. **Не парное** → `subscriptionsService.deduct(studentId, groupId, sessionDuration)`
   (он уже выбирает «свой» абонемент с совпадающей длительностью → любой свой →
   общий по `groupIds`). Списалось → визит `billing='subscription'`,
   `subscription_id = sub.id`.
3. **Парное или абонемента нет** → авто-платёж:
   - локация: `training.locationId`, иначе дефолтная локация тренера
     (`is_default`), иначе тарифа нет;
   - тариф: `PricingRulesService.findMatch` по `tuples` из §2 (первое совпадение);
   - прайм: `training.isPrime` (хранится на тренировке) — выбирает
     `client_prime_price`/`hall_prime_cost` против обычных;
   - `paid_at = training.date`;
   - не-онлайн → создать расход зала (`hall_payment_type = paymentType`,
     `time_slot` по прайму, `training_time = training.time`), затем платёж
     с `hall_cost_id`; онлайн → только платёж;
   - визит `billing='payment'`, `payment_id`.
4. **Тариф не найден** → визит `billing='none'`; в ответе флаг для предупреждения.

Ошибка биллинга не ломает отметку: при сбое резолва/создания платежа визит
сохраняется с `billing='none'` и учеником в списке предупреждений.

Связь attendee (`$add`) и визит создаются как сейчас; `enqueueUpsert` календаря
сохраняется.

### Контракт ответа

`POST /trainings/:id/attendees` возвращает
`{ training, billing: BillingResult[] }`, где

```ts
interface BillingResult {
  studentId: string
  billing: 'subscription' | 'payment' | 'none'
  /** Для 'subscription': статус после списания. */
  subStatus?: 'ok' | 'ending' | 'expired'
  remaining?: number
}
```

UI строит тосты из этого массива без дозапросов учеников (`getStudentById` на
каждого больше не нужен).

## 4. Откат: `removeAttendee(training, studentId)`

Читает визит (`trainingId`, `studentId`) и откатывает строго по `billing`:

- `'subscription'` → найти абонемент по `subscription_id`; `remaining + 1`
  (cap по `total`), `isActive = true` при `remaining > 0`. Абонемент удалён →
  молча пропустить.
- `'payment'` → `paymentsService.removePayment(userId, paymentId)` (уже каскадно
  удаляет связанный расход зала). Платёж удалён вручную раньше → молча пропустить.
- `'none'` → ничего.
- `NULL` (легаси) → старое поведение: `subscriptionsService.restore(...)`.

Затем удалить визит, снять связь attendee, `enqueueUpsert`.

`removeTraining` / `removeSeries` (удаление тренировки/серии) откатывают каждого
посетителя через ту же логику — выносится в общий приватный метод
`revertVisit(training, studentId)`.

Сидер (`attachAttendeesWithVisits`) пишет визиты с `billing='none'` — демо-история
не порождает фантомных возвратов и платежей.

`SubscriptionsService` получает метод `restoreById(subscriptionId)` (точечный
возврат); старый `restore` остаётся для легаси-ветки.

## 5. Фронтенд

- **`training-logic.ts`:** `markAttendanceWithPayment` удаляется. `markAttendance`
  становится тонкой обёрткой: `POST attendees` → маппинг `billing[]` в
  существующий `MarkResult[]` (имена учеников — из кэша `useStudents`/репо).
  Импорт `autoCreatePayment` из этого файла уходит.
- **`trainings.repo.ts`:** `addAttendees` возвращает `{ training, billing }`
  (разбор нового ответа); добавляется `removeAttendee` → `DELETE
  /trainings/:id/attendees/:studentId` (уже есть — используется как единственный
  путь отката).
- **`use-calendar-training.ts`:** `saveAttendance` — добавление через
  `markAttendance` (репо), удаление через `removeAttendee` эндпоинт; финальная
  перезапись `updateTraining({ attendees })` удаляется; ручные
  `restoreSession`/`removeVisit` удаляются. Функция `removeAttendee` (точечное
  удаление ученика) — тоже на эндпоинт.
- **`use-mark-today.ts`:** вызовы `markAttendanceWithPayment` → `markAttendance`;
  предупреждения «нет тарифа» из `billing[]`.
- **`use-add-to-training.ts`, `use-group-training.ts`:** остаются на
  `useMarkAttendance`; мутация прокидывает `billing[]` для предупреждений.
- Тост предупреждения: ключ `finance.autoRecord.noTariff` (уже существует),
  показывается при любом `billing='none'` у не-легаси отметки.
- `auto-payment.ts` и `pricing-lookup.ts` остаются — их использует предоплата
  абонемента при покупке (вне объёма).

## 6. Тесты и проверка

**Jest (бэк, чистые функции):** `attendance-pricing.spec.ts` — вся матрица §2;
существующие 20 тестов не ломаются.

**Gate:** `npm run build -w apps/backend`, `npm run build -w apps/frontend`,
`npm test -w apps/backend`, миграция на локальной БД.

**Ручной чек-лист (демо-аккаунт):**

| # | Сценарий | Ожидание |
|---|---|---|
| 1 | Отметка с активным абонементом (любая точка UI) | списание −1, платежа нет |
| 2 | Снятие отметки сценария 1 | +1 на тот же абонемент |
| 3 | Отметка без абонемента, тариф есть (из календаря!) | платёж + расход зала |
| 4 | Снятие отметки сценария 3 | платёж и расход зала удалены |
| 5 | Повторная отметка того же ученика | дублей платежа/визита нет |
| 6 | Парное занятие: отметка обоих из календаря | 2 × `single_pair` платежа, абонементы не тронуты |
| 7 | Снятие одного из пары | его платёж удалён, абонемент не вырос |
| 8 | Отметка без абонемента и без тарифа | визит есть, тост «Нет тарифа», на снятии — ничего не возвращается |
| 9 | Общий абонемент, покрывающий группу | списание с общего, разовый платёж НЕ создан |
| 10 | Онлайн-занятие без абонемента | платёж без расхода зала |

## Вне объёма (отдельные задачи из бэклога)

- Парное занятие, отмеченное наполовину, теряет второго ученика в «Отметить
  сегодня» (ветка `attendees.length`).
- Отметка плановых занятий задним числом (не только «сегодня»).
- Фильтр шума в виджете «Ожидают оплаты».

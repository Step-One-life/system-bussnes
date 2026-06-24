# Редактирование абонемента — дизайн (спека)

**Дата:** 2026-06-25 · **Ветка:** `feat/edit-subscription`

## Проблема

Сейчас абонемент нельзя отредактировать: можно только «Продлить срок» (добавить N дней),
«Новый абонемент» (создать следующий) и «Удалить». А общий (мульти-групповой) абонемент
([shared-sub-card.tsx](../../../apps/frontend/src/entities/students/details/shared-sub-card.tsx))
вообще имеет только корзину — ни меню, ни продления. Тренер не может поправить дату «до» или
число занятий у уже выданного абонемента, особенно если он покрывает несколько групп
(сплит / индивид / групповой).

## Цель

Действие **«Редактировать абонемент»** во всех карточках абонемента, дающее менять:

1. **Дату «до»** (`expiresAt`) — задаётся напрямую, подтягивается везде (это единственный
   источник срока; статус/дни считаются от него на фронте).
2. **Количество занятий** (`total`) — с правилом: менять можно, но если новое число меньше уже
   использованных занятий (остаток ушёл бы в минус) — ошибка.
3. **Состав групп** (`groupIds`) — какие группы покрывает абонемент; одиночный ↔ общий и обратно.
   Только для **не-индивидуальных** абонементов (у индивидуального «группа» = сам ученик).

При **увеличении** количества — опциональный шаг «Записать доход» за добавленные занятия
(префилл из тарифа, правится вручную).

Решения пользователя (брейнсторм): состав групп — у любого группового; доход — тариф+ручной
ввод; «Продлить срок» **остаётся** рядом с «Редактировать»; «Списать» на общий не добавляем.

---

## Архитектура (вариант A — один PATCH + одна модалка)

- **Бэк:** новый `PATCH /api/students/:id/subscriptions/:subId`, частичное обновление.
- **Фронт:** новая модалка `EditSubModal`, чистые хелперы (валидация/префилл) + vitest.
- **Журнал:** новое view-only событие `subscription_edited` (как `subscription_extended`).
- **Доход:** переиспользуем существующий финпоток (`createPayment`), **без** нового эндпоинта
  и **без** привязки к абонементу.

Фича **не затрагивает** чек-лист ARCHITECTURE.md §8 (не новый вид занятия/тип оплаты).

---

## Бэкенд

### 1. DTO `UpdateSubscriptionDto`

Файл: `apps/backend/src/modules/student/dto/update-subscription.dto.ts` (новый).

Поля **все опциональны** (частичное обновление):

```ts
export class UpdateSubscriptionDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  total?: number

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  expiresAt?: string // 'YYYY-MM-DD'

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true })
  groupIds?: string[] // UUID групп (фронт мапит имена→UUID до отправки)
}
```

**Менять ТОЛЬКО эти поля.** Поля `isPair`, `isUnlimited`, `timeSlot`, `sessionDuration`,
`type`, `finPaymentId` **не трогаются никогда** (защита от регресса бага H3:
парный → одиночный → двойное списание).

### 2. Сервис `SubscriptionsService.updateById`

Файл: `apps/backend/src/modules/student/subscriptions.service.ts` (добавить метод).

```ts
async updateById(
  studentId: string,
  subId: string,
  fields: { total?: number; expiresAt?: string; groupIds?: string[] },
): Promise<Subscription> {
  const sub = await this.subModel.findOne({ where: { id: subId, studentId } })
  if (!sub) throw new NotFoundException('Абонемент не найден')

  // ── Все валидации ДО любых мутаций ──
  const used = sub.total - sub.remaining
  if (fields.total !== undefined && !sub.isUnlimited && fields.total < used) {
    throw new BadRequestException(`Использовано ${used} занятий — меньше нельзя`)
  }

  // ── Применяем поля к инстансу (без промежуточных save) ──
  // Количество: только для НЕ-безлимита (у безлимита total/remaining семантически пусты).
  if (fields.total !== undefined && !sub.isUnlimited) {
    sub.total = fields.total
    sub.remaining = fields.total - used // used сохраняется, остаток = новое total − использованные
  }

  // Дата: expiresAt — единственный источник срока.
  if (fields.expiresAt !== undefined) {
    sub.expiresAt = fields.expiresAt
  }

  // Состав групп: groupId должен остаться в наборе (иначе берём первый).
  if (fields.groupIds !== undefined) {
    sub.groupIds = fields.groupIds
    if (!fields.groupIds.includes(sub.groupId)) sub.groupId = fields.groupIds[0]
  }

  // ── Финальный пересчёт isActive ПО ИТОГОВОМУ remaining (не по каждому полю!) ──
  // Безлимит: isActive не трогаем (снимается только удалением). Иначе: активен ⇔ остаток > 0.
  if (!sub.isUnlimited) {
    sub.isActive = sub.remaining > 0
  }

  await sub.save() // один save
  return sub
}
```

**Почему финальный пересчёт, а не по полю** (находка critique #1): тренер часто правит
дату И количество одновременно («продли и добавь занятий»). Если считать `isActive` по дате
сначала (по старому `remaining=0` → остаётся false), а потом поднять `remaining` — абонемент
останется неактивным. Поэтому `isActive` определяется один раз по **итоговому** `remaining`.

**Безлимит** (находка #2): при `isUnlimited` меняем только `expiresAt`/`groupIds`;
`total`/`remaining`/`isActive` не трогаем.

**Транзакция:** один `sub.save()` достаточно (одна строка). Главное — все валидации до мутаций
(находка #7). Паттерн владения `findOne({ where: { id, studentId } })` — как у `deductById`/`extendById`.

### 3. Контроллер — эндпоинт

Файл: `apps/backend/src/modules/student/student.controller.ts` (добавить метод, по образцу `extend`).

```ts
@Patch(':id/subscriptions/:subId')
@ApiOperation({ summary: 'Редактировать абонемент' })
async editSubscription(
  @CurrentUser() user: CurrentUserPayload,
  @Param('id') id: string,
  @Param('subId') subId: string,
  @Body() dto: UpdateSubscriptionDto,
): Promise<Student> {
  const student = await this.studentService.findOneForUser(user.id, id)
  const sub = student.subscriptions?.find((s) => s.id === subId)
  // IDOR: владение ВСЕМИ новыми группами обязательно (как addSubscription).
  if (dto.groupIds) {
    await assertOwned(this.groupModel, user.id, dto.groupIds, 'Группа не найдена')
  }
  // Имя группы для журнала фиксируем ДО правки (groupId после смены состава может смениться).
  const groupName = sub ? await this.activityLog.groupName(sub.groupId) : undefined
  if (sub) {
    await this.subscriptionsService.updateById(id, subId, dto)
    const studentName = await this.activityLog.studentName(id)
    await this.activityLog.log({
      userId: user.id,
      type: 'subscription_edited',
      studentId: id,
      subscriptionId: subId,
      summary: { studentName, groupName },
    })
  }
  return this.studentService.findOneForUser(user.id, id)
}
```

**IDOR** (находка #3): `assertOwned` по всему `dto.groupIds`. Итоговый `groupId` бэк берёт
только из проверенного набора. Если эндпоинт `@Patch` уже занят `linkPayment`/`extend` — нет,
они на под-путях `:subId/extend` и `:subId/link-payment`; `:id/subscriptions/:subId` под `@Patch`
свободен (сейчас там только `@Delete`).

**Журнал** (находка #6): `groupName` резолвим **до** `updateById` (после смены состава
`sub.groupId` может смениться, и `groupName(sub.groupId)` дал бы новую группу).

### 4. Журнал — новый тип `subscription_edited` (view-only)

5 обязательных точек (шаблон — `subscription_extended`):

| # | Файл | Изменение |
|---|------|-----------|
| 1 | `packages/shared/src/api/shapes.ts` (union `ActivityType`) | добавить `\| 'subscription_edited'` |
| 2 | `apps/backend/src/modules/activity-log/activity-log.types.ts` (`VIEW_ONLY[]`) | добавить `'subscription_edited'` |
| 3a | `apps/frontend/src/entities/activity-log/model/describe-event.ts` (`ICONS`) | `subscription_edited: '✏️'` |
| 3b | там же (`VIEW_ONLY[]`) | `'subscription_edited'` |
| 3c | там же (`switch`) | `case 'subscription_edited'` → `titleKey: 'journal.icon.subscriptionEdited'`, `titleParams: { name: nameWithGroup }` |
| 4 | `locales/ru/translation.json` + `en/translation.json` (`journal.icon`) | `subscriptionEdited`: «Изменён абонемент: {{name}}» / «Subscription edited: {{name}}» |

`ICONS` и оба `switch`/`VIEW_ONLY` типизированы (`Record<ActivityType, string>` и exhaustive
switch) — TypeScript сам укажет на пропуск при сборке. View-only зеркалируется в двух местах
(бэк `activity-log.types.ts` + фронт `describe-event.ts`) — обновить оба.

---

## Фронтенд

### 5. Репозиторий `students.repo.editSubscription`

Файл: `apps/frontend/src/entities/students/model/students.repo.ts` (добавить, зеркало `addSubscription` L117–150).

```ts
export async function editSubscription(
  studentId: string,
  subId: string,
  body: { total?: number; expiresAt?: string; groupIds?: string[] }, // groupIds — ИМЕНА групп
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (body.total !== undefined) payload.total = body.total
  if (body.expiresAt !== undefined) payload.expiresAt = body.expiresAt
  if (body.groupIds !== undefined) {
    const { byName } = await getGroupMaps() // имена → UUID, как addSubscription
    payload.groupIds = body.groupIds.map((name) => byName.get(name) ?? name)
  }
  await apiClient.patch(`/students/${studentId}/subscriptions/${subId}`, payload)
}
```

**Маппинг** (находка groups-mapping): `groupIds` приходят как имена (фронт работает с именами
групп), мапятся в UUID через `getGroupMaps().byName` — ровно как `addSubscription`. Бэк ждёт UUID.
Если имя не в карте — fallback `?? name` уйдёт на бэк и `assertOwned` вернёт 404; модалка
использует уже загруженный `useGroups()`, поэтому карта актуальна.

Подключить мутацию в `use-student-actions.ts` (или existing actions-хук), с инвалидацией
`studentKeys.all` (карточка сама переедет shared↔single) и, при записи дохода, `financeKeys.payments`.

### 6. Чистые хелперы — `edit-sub.ts` (+ `edit-sub.spec.ts`, vitest)

Файл: `apps/frontend/src/entities/students/subscriptions/edit-sub.ts` (новый).

```ts
import type { PricingRule } from 'entities/finance/model/types'
import type { Subscription } from '../model/types'

/** Минимально допустимое количество: нельзя ниже использованных и не ноль. */
export function minTotal(sub: Subscription): number {
  const used = sub.total - sub.remaining
  return Math.max(used, 1) // не допускаем total=0 (находка #10)
}

/** Новый остаток после смены количества (used сохраняется). */
export function nextRemaining(sub: Subscription, newTotal: number): number {
  const used = sub.total - sub.remaining
  return newTotal - used
}

/** Валидно ли новое количество (остаток не уходит в минус). */
export function isValidTotal(sub: Subscription, newTotal: number): boolean {
  if (sub.isUnlimited) return true
  return newTotal >= minTotal(sub)
}

/**
 * Префилл дохода за ДОБАВЛЕННЫЕ занятия = пропорция от цены блока тарифа
 * (тариф хранит цену за весь блок sessions_count, не за занятие — находка #4).
 * Возвращает null, если подходящий тариф не найден (поле остаётся пустым).
 */
export function prefillIncome(
  rule: PricingRule | null,
  addedCount: number,
  isPrime: boolean,
): number | null {
  if (!rule || addedCount <= 0 || !rule.sessions_count) return null
  const blockPrice = isPrime ? rule.client_prime_price : rule.client_price
  if (blockPrice == null) return null
  return Math.round((Number(blockPrice) / rule.sessions_count) * addedCount)
}
```

Матч тарифа делаем **синхронно** через `matchRule(rules, tuple)` на уже загруженных
`usePricingRules(locationId)` (не асинхронный `resolvePricingRule`). `tuple` строим из абонемента
best-effort: `lessonKind` = (индив → `individual`; `groupIds.length > 1` → `shared`; иначе `group`),
`durationMinutes` = `sub.sessionDuration`. Если матч неоднозначен/не найден — `prefillIncome`
вернёт null, поле пустое, тренер вводит вручную. `isPrime = sub.timeSlot === 'prime'`.

**vitest-кейсы:** `minTotal` (= max(used,1); used=0 → 1); `nextRemaining` (used сохраняется);
`isValidTotal` (newTotal<used → false; безлимит → true); `prefillIncome` (пропорция от блока;
prime → prime-цена; нет тарифа → null; addedCount≤0 → null).

### 7. Модалка `EditSubModal`

Файл: `apps/frontend/src/entities/students/subscriptions/edit-sub-modal.tsx` (новый).
Контейнер — `AdaptiveSheet` с `footer` (как `renew-sub-modal`/`mark-paid-modal`), **не** голый `Modal`.

**Пропсы:** `{ open, studentId, sub: Subscription, isIndividual: boolean, onClose }`.

**Поля:**
- **Дата «до»** — `DatePicker format="DD.MM.YYYY"`, value `dayjs(date)`, onChange → `d.format('YYYY-MM-DD')`. Дефолт `sub.expiresAt`.
- **Количество** — `InputNumber min={minTotal(sub)} precision={0} inputMode="numeric"`, дефолт `sub.total`. Подсказка «использовано N». **Скрыто** при `sub.isUnlimited` (находка #2). Инлайн-ошибка, если `!isValidTotal`.
- **Группы** — `Select mode="multiple"` имён групп ученика (источник `useGroups()`, `regularGroups = groups.filter(g => !g.isIndividual)`), дефолт `selected = sub.groupIds ?? [sub.groupId]`, минимум 1. **Скрыто** при `isIndividual` (находка #11).
- **Доход** — показывается только при `newTotal > sub.total`: чекбокс «Записать доход» → раскрывает поле суммы (`InputNumber`, префилл `prefillIncome(...)`, всегда редактируемо вручную).

**Сохранение:**
1. Клиентская валидация (`isValidTotal`) — иначе «Сохранить» disabled + инлайн (бэк — финальный источник, тост на 400).
2. `editSubscription(studentId, sub.id, { total?, expiresAt?, groupIds? })` (шлём только реально изменённые поля).
3. Если чекбокс дохода включён и сумма > 0 — **после** успешного PATCH создать **отдельный**
   доходный платёж (см. §8). Ошибка дохода **не откатывает** правку (тост, но edit уже сохранён).
4. `onClose()` + инвалидация (`studentKeys.all`, при доходе `financeKeys.payments`).

### 8. Доход за добавленные занятия (находка #5 — НЕ привязывать!)

Доход создаём как **самостоятельный** платёж и **НЕ** вызываем `linkPaymentToSub`:
`linkPayment` делает `sub.update({ finPaymentId })` **безусловно** — у уже оплаченного абонемента
это затёрло бы ссылку на исходный платёж (осиротил бы исходный доход, сломал бы откаты
`deductById`/`extendById`). Поэтому:

```ts
await createPayment({
  student_id: studentId,
  location_id: locationId,             // из первичной группы абонемента
  client_payment_type: derivePaymentType(sub), // по lessonKind/format (хелпер)
  client_amount: amount,
  sessions_total: addedCount,
  paid_at: todayISO(),
  log_as_payment: true,                // пишет журнал payment_recorded (как «Добавить оплату»)
})
// БЕЗ linkPaymentToSub — finPaymentId абонемента не трогаем.
```

`derivePaymentType(sub)` строит тот же `tuple`, что и префилл (§6: `lessonKind` из контекста,
`durationMinutes = sub.sessionDuration`, `sessionsCount = addedCount`), и зовёт существующий
`tuplePaymentType(tuple)` (тот же хелпер, что в `autoCreatePayment`). `locationId` — `locationId`
первичной группы абонемента (из `useGroups()`).

«Оплачено/не оплачено» (`finPaymentId`) по-прежнему управляется отдельным «Отметить оплаченным».
Доход на edit — чистая финансовая запись за добавленные занятия. Не используем `autoCreatePayment`
(он всегда линкует и не шлёт `log_as_payment`).

### 9. Карточки — подключение «Редактировать»

- **`SubCard`** ([sub-card.tsx](../../../apps/frontend/src/entities/students/details/sub-card.tsx)):
  новый проп `onEdit`, пункт меню «Редактировать» (над «Продлить срок»). `onEdit` оперирует
  **конкретным** `anySub.id` (= `activeSub ?? самый свежий`) — не «первым по группе» абстрактно (находка #8).
- **`SharedSubCard`** ([shared-sub-card.tsx](../../../apps/frontend/src/entities/students/details/shared-sub-card.tsx)):
  сейчас только корзина — добавить меню «…» (`Dropdown`/`MoreOutlined`) с **«Редактировать» +
  «Продлить срок» + «Удалить»** (передавать `sub.id` напрямую). Сохранить «Отметить оплаченным».
  «Списать» не добавляем (неоднозначно по группе, делается при отметке).
- **`student-drawer.tsx`**: новое состояние `editSub: { sub } | null`, рендер `EditSubModal`;
  прокинуть `onEdit` в обе карточки. После PATCH со сменой `groupIds.length` карточка
  авто-переезжает shared↔single через инвалидацию `studentKeys` — проверить в e2e (находка #8).
- i18n: `students.subCard.editSub` («Редактировать»), ключи полей модалки (дата/количество/группы/доход),
  сообщение об ошибке минуса.

---

## Гейт / verification

1. Сборки: `npm run build` (shared → backend → frontend).
2. `npm test -w apps/backend` (jest): `updateById` — минус → 400; пересчёт `remaining = newTotal − used`;
   `isActive` по итоговому остатку при одновременной правке даты+количества; безлимит — правка даты
   не трогает total/remaining/isActive; смена состава: выпавший `groupId` → `groupIds[0]`; правка
   парного сохраняет `isPair=true`; чужая группа в `groupIds` → 404.
3. `npm test -w apps/frontend` (vitest): хелперы `edit-sub.ts` (см. §6).
4. `npm run lint -w apps/frontend` — 0/0.
5. Живой API-e2e (логин demo → создать абонемент → PATCH дата/количество/состав → ассерты;
   минус → 400; одиночный→общий→одиночный переезд карточки).

## Краевые случаи (сведено из адверсариальной критики)

- **Безлимит:** правка только даты; total/remaining/isActive не трогаются.
- **Парный (`isPair`):** поле не в DTO → сохраняется; jest подтверждает (анти-регресс H3).
- **Разовый (`type='1'`):** `min = max(used,1)`; увеличение допустимо (становится мультипакетом),
  тип в DTO не меняется — осознанное ограничение v1.
- **Одиночный↔общий:** `groupIds.length` >1/=1 авто-переключает секцию карточки через инвалидацию.
- **Доход:** отдельный платёж без link-payment; не задваивает и не затирает `finPaymentId`.
- **Журнал:** view-only, без отката; `groupName` фиксируется до правки состава.
- **IDOR:** `assertOwned` по всему `groupIds`; фронт мапит имена→UUID из актуального `useGroups()`.

## Вне объёма (v1)

- Тип/длительность/прайм-слот/парность в редакторе **не** меняются.
- Журнал не фиксирует старые/новые значения (только факт правки) — возможное расширение
  (`oldTotal`/`newTotal` в `ActivitySummary`).
- «Списать» на карточке общего абонемента.

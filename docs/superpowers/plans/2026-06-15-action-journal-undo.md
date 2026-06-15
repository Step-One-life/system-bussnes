# Журнал действий + отмена — План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Лента действий тренера (отметки, абонементы, оплаты, занятия) с откатом ошибочного действия одной кнопкой.

**Architecture:** Новая таблица `activity_logs` (append-only) пишется на бэке при действиях. `ActivityLogModule` (модель + запись/чтение, зависит только от моделей) пишет события; домены (Training/Student/Finance) импортируют его и зовут на запись. Отдельный `ActivityUndoModule` (импортирует домены) делает откат, переиспользуя готовые обратные операции. Признак «отменено» (`undone_at`) проставляется хуками внутри самих обратных операций (`removeAttendee`/`removeTraining`/`removePayment`/`subscriptions.remove`), поэтому журнал честен независимо от того, откуда сделан откат. Фронт: пункт «Журнал» в меню профиля → экран `/journal` с infinite-scroll, группировкой по дням и сворачиваемыми пакетами (`batch_id`), тостом «Вернуть».

**Tech Stack:** NestJS + Sequelize + MySQL (бэк), React + react-query + antd + i18next (фронт), `@trikick/shared` (общие типы), jest (бэк, чистые функции), vitest (фронт, чистые функции).

**Спека:** `docs/superpowers/specs/2026-06-15-action-journal-undo-design.md`

**Конвенции (важно для каждого шага):** без точек с запятой, одинарные кавычки, отступ 2 пробела. Бэк-модели extends `BaseEntity`, поля через `@Column({ field: 'snake_case' })`, таблицы underscored. Контроллеры — `@UseGuards(JwtAuthGuard)` + `@CurrentUser() user: CurrentUserPayload`. Ответы оборачиваются интерсептором в `{ data, success }` — возвращать «сырой» объект. Фронтовый `apiClient.get/post/delete` сам распаковывает `data`. UI-тексты — только i18next. vitest: импортировать чистые модули ВГЛУБЬ (`entities/.../model/...`), НЕ через barrel (barrel тянет UI → `matchMedia` падает в node-окружении).

**Команды-гейт:**
- Бэк jest: `npm test -w apps/backend`
- Фронт vitest: `npm test -w apps/frontend`
- Сборки: `npm run build -w apps/backend`, `npm run build -w apps/frontend`
- Миграции: `npm run migrate -w apps/backend`
- eslint фронт: `npx eslint apps/frontend/src --quiet`

---

## Карта файлов

**Создаются (бэк):**
- `apps/backend/database/migrations/20260615000001-create-activity-logs.js` — таблица.
- `apps/backend/src/modules/activity-log/activity-log.model.ts` — модель.
- `apps/backend/src/modules/activity-log/activity-log.types.ts` — enum типов + хелперы (чистые, под jest).
- `apps/backend/src/modules/activity-log/activity-log.types.spec.ts` — jest.
- `apps/backend/src/modules/activity-log/activity-log.service.ts` — запись/чтение/markUndone.
- `apps/backend/src/modules/activity-log/activity-log.module.ts` — модуль записи/чтения.
- `apps/backend/src/modules/activity-log/activity-undo.service.ts` — оркестрация отката.
- `apps/backend/src/modules/activity-log/activity-log.controller.ts` — GET список + POST undo.
- `apps/backend/src/modules/activity-log/activity-undo.module.ts` — модуль отката (контроллер + undo-сервис).
- `apps/backend/src/modules/activity-log/dto/list-activity.dto.ts`, `dto/batch-id-param.dto.ts`.

**Изменяются (бэк):**
- `packages/shared/src/api/shapes.ts` — `ActivityType`, `ActivityLogEntryShape`, `ActivitySummary`.
- `packages/shared/src/index.ts` — реэкспорт (если нужно).
- `apps/backend/src/app.module.ts` — импорт `ActivityLogModule`, `ActivityUndoModule`.
- `apps/backend/src/modules/training/training.module.ts` — импорт `ActivityLogModule`.
- `apps/backend/src/modules/training/training.controller.ts` — `batchId` в addAttendees/create, лог create, лог attendance, лог delete.
- `apps/backend/src/modules/training/training.service.ts` — `markAttendanceUndone` хук в `removeAttendee`; `markTrainingCreatedUndone` хук в `removeTraining`; `amount`/`paymentId` в `BillingResult`.
- `apps/backend/src/modules/training/dto/attendees.dto.ts` — опц. `batchId`.
- `apps/backend/src/modules/training/dto/create-training.dto.ts` — опц. `batchId`.
- `apps/backend/src/modules/student/student.module.ts` — импорт `ActivityLogModule`.
- `apps/backend/src/modules/student/student.controller.ts` — лог subscription_created (batchId) + лог payment_recorded на link-payment (флаг).
- `apps/backend/src/modules/student/subscriptions.service.ts` — `markSubscriptionUndone` хук в `remove`.
- `apps/backend/src/modules/student/dto/*` — опц. `batchId` в add-subscription DTO; опц. `logAsPayment` + summary в link-payment DTO.
- `apps/backend/src/modules/finance/finance.module.ts` — импорт `ActivityLogModule`.
- `apps/backend/src/modules/finance/payments.service.ts` — `markPaymentUndone` хук в `removePayment`.

**Создаются (фронт):**
- `apps/frontend/src/entities/activity-log/model/types.ts` — типы (реэкспорт shared + UI-тип).
- `apps/frontend/src/entities/activity-log/model/activity-log.repo.ts` — API.
- `apps/frontend/src/entities/activity-log/model/group-log.ts` — чистая группировка (под vitest).
- `apps/frontend/src/entities/activity-log/model/group-log.spec.ts` — vitest.
- `apps/frontend/src/entities/activity-log/model/describe-event.ts` — чистый маппинг тип→иконка/текст (под vitest).
- `apps/frontend/src/entities/activity-log/model/describe-event.spec.ts` — vitest.
- `apps/frontend/src/entities/activity-log/api/use-activity-log.ts` — useInfiniteQuery + мутации.
- `apps/frontend/src/entities/activity-log/index.ts` — barrel.
- `apps/frontend/src/pages/journal/journal-page.tsx`, `journal-page.scss`, `index.ts`.
- `apps/frontend/src/common/utils/batch-id.ts` — генератор `batchId` (обёртка над uuid).

**Изменяются (фронт):**
- `apps/frontend/src/app/routes.tsx` — маршрут `/journal`.
- `apps/frontend/src/app/layout/profile-menu.tsx` — пункт «Журнал».
- `apps/frontend/src/locales/ru/translation.json`, `en/translation.json` — ключи `nav.journal`, секция `journal`.
- `apps/frontend/src/entities/trainings/model/trainings.repo.ts` — `batchId` в `addAttendees`/`createTraining`.
- `apps/frontend/src/entities/trainings/model/training-logic.ts` — проброс `batchId` в `markAttendance`.
- `apps/frontend/src/pages/home/use-day-marking.ts` — один `batchId` на сохранение.
- `apps/frontend/src/entities/trainings/form/use-individual-session.ts`, `use-pair-session.ts` — `batchId` на серию.
- `apps/frontend/src/entities/trainings/form/use-calendar-training.ts` — `batchId` на отметку.
- `apps/frontend/src/entities/students/model/students.repo.ts` — `batchId` в `addSubscription`; `logAsPayment`+summary в `linkPaymentToSub`.
- `apps/frontend/src/entities/finance/form/mark-paid-modal.tsx` — `logAsPayment` при link.

---

## Phase A — Бэкенд: фундамент (таблица, модель, типы)

### Task A1: Общие типы в shared

**Files:**
- Modify: `packages/shared/src/api/shapes.ts`

- [ ] **Step 1: Добавить типы в shapes.ts**

В конец файла `packages/shared/src/api/shapes.ts` добавить:

```ts
export type ActivityType =
  | 'attendance_marked'
  | 'subscription_created'
  | 'payment_recorded'
  | 'training_created'
  | 'training_deleted'

/** Денормализованные поля для отображения строки журнала (имена/суммы на момент события). */
export interface ActivitySummary {
  studentName?: string
  groupName?: string
  trainingTime?: string
  trainingDate?: string
  /** Чем оплачена отметка. */
  billing?: 'subscription' | 'payment' | 'none'
  /** Остаток занятий на абонементе после списания. */
  remaining?: number
  /** Число занятий в созданном абонементе. */
  sessionsCount?: number
  /** Денежная сумма (платёж/оплата). */
  amount?: number
}

export interface ActivityLogEntryShape {
  id: string
  type: ActivityType
  batchId: string | null
  createdAt: string
  undoneAt: string | null
  trainingId: string | null
  studentId: string | null
  subscriptionId: string | null
  paymentId: string | null
  summary: ActivitySummary
}

export interface ActivityLogPageShape {
  data: ActivityLogEntryShape[]
  nextCursor: string | null
}
```

- [ ] **Step 2: Проверить сборку shared**

Run: `npm run build -w packages/shared` (если в shared есть build; иначе `npm run build -w apps/backend` подтянет типы)
Expected: 0 ошибок типов.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/api/shapes.ts
git commit -m "feat(shared): типы ActivityLog для журнала действий"
```

---

### Task A2: Миграция таблицы activity_logs

**Files:**
- Create: `apps/backend/database/migrations/20260615000001-create-activity-logs.js`

- [ ] **Step 1: Создать миграцию**

Содержимое (формат как у существующих миграций — `queryInterface.createTable`, snake_case, индексы):

```javascript
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activity_logs', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: { type: Sequelize.STRING, allowNull: false },
      batch_id: { type: Sequelize.UUID, allowNull: true },
      training_id: { type: Sequelize.UUID, allowNull: true },
      student_id: { type: Sequelize.UUID, allowNull: true },
      subscription_id: { type: Sequelize.UUID, allowNull: true },
      payment_id: { type: Sequelize.UUID, allowNull: true },
      summary: { type: Sequelize.JSON, allowNull: false },
      undone_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
    // Лента: выборка по владельцу в обратном хронопорядке.
    await queryInterface.addIndex('activity_logs', ['user_id', 'created_at'], {
      name: 'idx_activity_user_created',
    })
    // Группировка пакетов и markUndone по batch.
    await queryInterface.addIndex('activity_logs', ['batch_id'], {
      name: 'idx_activity_batch',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_logs')
  },
}
```

> Намеренно БЕЗ FK на trainings/subscriptions/payments — лог должен переживать удаление
> объектов (ссылки — «мягкие» указатели для отката, проверяются в рантайме).

- [ ] **Step 2: Прогнать миграцию**

Run: `npm run migrate -w apps/backend`
Expected: «migrated» для `20260615000001-create-activity-logs`, без ошибок.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/database/migrations/20260615000001-create-activity-logs.js
git commit -m "feat(backend): миграция таблицы activity_logs"
```

---

### Task A3: Модель ActivityLog

**Files:**
- Create: `apps/backend/src/modules/activity-log/activity-log.model.ts`

- [ ] **Step 1: Создать модель**

```ts
import { Column, DataType, Table } from 'sequelize-typescript'

import type { ActivitySummary, ActivityType } from '@trikick/shared'

import { BaseEntity } from '../../common/entities/base.entity'

@Table({ tableName: 'activity_logs' })
export class ActivityLog extends BaseEntity {
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string

  @Column({ type: DataType.STRING, allowNull: false })
  declare type: ActivityType

  @Column({ field: 'batch_id', type: DataType.UUID, allowNull: true })
  declare batchId: string | null

  @Column({ field: 'training_id', type: DataType.UUID, allowNull: true })
  declare trainingId: string | null

  @Column({ field: 'student_id', type: DataType.UUID, allowNull: true })
  declare studentId: string | null

  @Column({ field: 'subscription_id', type: DataType.UUID, allowNull: true })
  declare subscriptionId: string | null

  @Column({ field: 'payment_id', type: DataType.UUID, allowNull: true })
  declare paymentId: string | null

  @Column({ type: DataType.JSON, allowNull: false })
  declare summary: ActivitySummary

  @Column({ field: 'undone_at', type: DataType.DATE, allowNull: true })
  declare undoneAt: Date | null
}
```

- [ ] **Step 2: Проверить компиляцию**

Run: `npm run build -w apps/backend`
Expected: 0 ошибок (модель ещё нигде не зарегистрирована — это норм).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/activity-log/activity-log.model.ts
git commit -m "feat(backend): модель ActivityLog"
```

---

### Task A4: Чистые хелперы типов + jest

**Files:**
- Create: `apps/backend/src/modules/activity-log/activity-log.types.ts`
- Test: `apps/backend/src/modules/activity-log/activity-log.types.spec.ts`

- [ ] **Step 1: Написать падающий тест**

`apps/backend/src/modules/activity-log/activity-log.types.spec.ts`:

```ts
import { isUndoable } from './activity-log.types'

describe('isUndoable', () => {
  it('обратимые типы', () => {
    expect(isUndoable('attendance_marked')).toBe(true)
    expect(isUndoable('subscription_created')).toBe(true)
    expect(isUndoable('payment_recorded')).toBe(true)
    expect(isUndoable('training_created')).toBe(true)
  })

  it('удаление занятия — view-only', () => {
    expect(isUndoable('training_deleted')).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить тест — падает**

Run: `npm test -w apps/backend -- activity-log.types`
Expected: FAIL — «Cannot find module './activity-log.types'».

- [ ] **Step 3: Реализовать**

`apps/backend/src/modules/activity-log/activity-log.types.ts`:

```ts
import type { ActivityType } from '@trikick/shared'

/** Удаление занятия — единственный необратимый (view-only) тип. */
export function isUndoable(type: ActivityType): boolean {
  return type !== 'training_deleted'
}
```

- [ ] **Step 4: Запустить тест — проходит**

Run: `npm test -w apps/backend -- activity-log.types`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/activity-log/activity-log.types.ts apps/backend/src/modules/activity-log/activity-log.types.spec.ts
git commit -m "feat(backend): isUndoable + тест"
```

---

### Task A5: ActivityLogService (запись/чтение/markUndone) + модуль

**Files:**
- Create: `apps/backend/src/modules/activity-log/activity-log.service.ts`
- Create: `apps/backend/src/modules/activity-log/activity-log.module.ts`

- [ ] **Step 1: Реализовать сервис**

`apps/backend/src/modules/activity-log/activity-log.service.ts`. Сервис зависит ТОЛЬКО от
моделей (ActivityLog + Student + Group для резолва имён) — никаких доменных сервисов, чтобы
не было циклов. Транзакция пробрасывается опционально, чтобы запись шла в той же транзакции,
что и действие.

```ts
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op, type Transaction } from 'sequelize'

import type { ActivityLogEntryShape, ActivitySummary, ActivityType } from '@trikick/shared'

import { Group } from '../group/group.model'
import { Student } from '../student/student.model'
import { ActivityLog } from './activity-log.model'

interface LogInput {
  userId: string
  type: ActivityType
  batchId?: string | null
  trainingId?: string | null
  studentId?: string | null
  subscriptionId?: string | null
  paymentId?: string | null
  summary: ActivitySummary
}

const PAGE_SIZE = 30

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectModel(ActivityLog) private readonly model: typeof ActivityLog,
    @InjectModel(Student) private readonly studentModel: typeof Student,
    @InjectModel(Group) private readonly groupModel: typeof Group,
  ) {}

  /** Имя ученика для summary (пустая строка, если не найден). */
  async studentName(studentId: string): Promise<string> {
    const s = await this.studentModel.findByPk(studentId)
    return s?.name ?? ''
  }

  /** Имя группы по UUID (на фронте groupId = имя, в БД — UUID). */
  async groupName(groupId: string): Promise<string> {
    const g = await this.groupModel.findByPk(groupId)
    return g?.name ?? ''
  }

  async log(input: LogInput, tx: Transaction | null = null): Promise<ActivityLog> {
    return this.model.create(
      {
        userId: input.userId,
        type: input.type,
        batchId: input.batchId ?? null,
        trainingId: input.trainingId ?? null,
        studentId: input.studentId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        paymentId: input.paymentId ?? null,
        summary: input.summary,
        undoneAt: null,
      },
      { transaction: tx ?? undefined },
    )
  }

  /** Лента порциями: обратный хронопорядок, курсор — created_at последней строки. */
  async list(userId: string, cursor: string | null): Promise<{ data: ActivityLog[]; nextCursor: string | null }> {
    const where: Record<string, unknown> = { userId }
    if (cursor) where.createdAt = { [Op.lt]: new Date(cursor) }
    const rows = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: PAGE_SIZE + 1,
    })
    const hasMore = rows.length > PAGE_SIZE
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows
    const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : null
    return { data: page, nextCursor }
  }

  /** Пометить активное событие отменённым (идемпотентно). Возвращает true, если что-то пометили. */
  private async markUndone(where: Record<string, unknown>): Promise<void> {
    await this.model.update(
      { undoneAt: new Date() },
      { where: { ...where, undoneAt: { [Op.is]: null } } },
    )
  }

  async markAttendanceUndone(trainingId: string, studentId: string): Promise<void> {
    await this.markUndone({ type: 'attendance_marked', trainingId, studentId })
  }

  async markTrainingCreatedUndone(trainingId: string): Promise<void> {
    await this.markUndone({ type: 'training_created', trainingId })
  }

  async markSubscriptionUndone(subscriptionId: string): Promise<void> {
    await this.markUndone({ type: 'subscription_created', subscriptionId })
  }

  async markPaymentUndone(paymentId: string): Promise<void> {
    await this.markUndone({ type: 'payment_recorded', paymentId })
  }

  /** Установить undone_at напрямую (для отката, когда обратная операция недостижима). */
  async setUndoneById(id: string): Promise<void> {
    await this.markUndone({ id })
  }

  toShape(row: ActivityLog): ActivityLogEntryShape {
    return {
      id: row.id,
      type: row.type,
      batchId: row.batchId,
      createdAt: row.createdAt.toISOString(),
      undoneAt: row.undoneAt ? row.undoneAt.toISOString() : null,
      trainingId: row.trainingId,
      studentId: row.studentId,
      subscriptionId: row.subscriptionId,
      paymentId: row.paymentId,
      summary: row.summary,
    }
  }
}
```

- [ ] **Step 2: Создать модуль**

`apps/backend/src/modules/activity-log/activity-log.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { Group } from '../group/group.model'
import { Student } from '../student/student.model'
import { ActivityLog } from './activity-log.model'
import { ActivityLogService } from './activity-log.service'

@Module({
  imports: [SequelizeModule.forFeature([ActivityLog, Student, Group])],
  providers: [ActivityLogService],
  exports: [ActivityLogService, SequelizeModule],
})
export class ActivityLogModule {}
```

- [ ] **Step 3: Проверить компиляцию**

Run: `npm run build -w apps/backend`
Expected: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/activity-log/activity-log.service.ts apps/backend/src/modules/activity-log/activity-log.module.ts
git commit -m "feat(backend): ActivityLogService (запись/чтение/markUndone) + модуль"
```

---

## Phase B — Бэкенд: запись событий в точках действий

### Task B1: Расширить BillingResult суммой и paymentId

**Files:**
- Modify: `apps/backend/src/modules/training/training.service.ts`

- [ ] **Step 1: Найти тип BillingResult**

Открыть `training.service.ts`, найти объявление `BillingResult` (используется в `markAttendance`).
Текущая форма: `{ studentId, billing, subStatus, remaining }`.

- [ ] **Step 2: Добавить поля**

В интерфейс `BillingResult` добавить `amount` и `paymentId`:

```ts
export interface BillingResult {
  studentId: string
  billing: VisitBilling
  subStatus: DeductStatus | null
  remaining: number | null
  amount: number | null
  paymentId: string | null
}
```

В `markAttendance`, в транзакции, где создаётся авто-платёж (ветка `if (billing === 'none')`),
сохранить сумму и id, и вернуть их в результате. Найти блок:

```ts
        if (billing === 'none') {
          const payment = await this.createAttendancePayment(training, studentId, tx).catch(
            () => null,
          )
          if (payment) {
            billing = 'payment'
            paymentId = payment.id
          }
        }
```

и добавить переменную суммы рядом с `paymentId`:

```ts
        let amount: number | null = null
        // ...
        if (billing === 'none') {
          const payment = await this.createAttendancePayment(training, studentId, tx).catch(
            () => null,
          )
          if (payment) {
            billing = 'payment'
            paymentId = payment.id
            amount = Number(payment.clientAmount)
          }
        }
```

И в `return { studentId, billing, subStatus, remaining }` внутри транзакции добавить `amount, paymentId`:

```ts
        return { studentId, billing, subStatus, remaining, amount, paymentId }
```

(Если `remaining`/`subStatus` объявлены выше — оставить; добавить только новые поля.)

- [ ] **Step 3: Проверить сборку**

Run: `npm run build -w apps/backend`
Expected: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/training/training.service.ts
git commit -m "feat(backend): BillingResult несёт amount/paymentId для журнала"
```

---

### Task B2: Хуки markUndone в обратных операциях

**Files:**
- Modify: `apps/backend/src/modules/training/training.service.ts`
- Modify: `apps/backend/src/modules/training/training.module.ts`
- Modify: `apps/backend/src/modules/student/subscriptions.service.ts`
- Modify: `apps/backend/src/modules/student/student.module.ts`
- Modify: `apps/backend/src/modules/finance/payments.service.ts`
- Modify: `apps/backend/src/modules/finance/finance.module.ts`

- [ ] **Step 1: Импортировать ActivityLogModule в три модуля**

В `training.module.ts`, `student.module.ts`, `finance.module.ts` добавить в `imports`:

```ts
import { ActivityLogModule } from '../activity-log/activity-log.module'
// ... в imports: [...] добавить ActivityLogModule
```

- [ ] **Step 2: Внедрить ActivityLogService и вызвать хуки**

`training.service.ts` — в конструктор добавить `private readonly activityLog: ActivityLogService`
(импорт `import { ActivityLogService } from '../activity-log/activity-log.service'`).
В `removeAttendee` после отката добавить пометку:

```ts
  async removeAttendee(training: Training, studentId: string): Promise<void> {
    await training.$remove('attendees', studentId)
    await this.revertVisit(training, studentId)
    await this.activityLog.markAttendanceUndone(training.id, studentId)
    await this.calendarSync.enqueueUpsert(training.userId, training.id, training.time)
  }
```

В `removeTraining` перед `await training.destroy()` добавить:

```ts
    await this.activityLog.markTrainingCreatedUndone(training.id)
```

`subscriptions.service.ts` — внедрить `ActivityLogService`, в `remove` после `await sub.destroy()` добавить:

```ts
    await this.activityLog.markSubscriptionUndone(subId)
```

`payments.service.ts` — внедрить `ActivityLogService`, в `removePayment` после `await payment.destroy()` добавить:

```ts
    await this.activityLog.markPaymentUndone(id)
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build -w apps/backend`
Expected: 0 ошибок (нет циклов — ActivityLogModule не импортирует эти модули).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/training apps/backend/src/modules/student apps/backend/src/modules/finance
git commit -m "feat(backend): хуки markUndone в removeAttendee/removeTraining/remove/removePayment"
```

---

### Task B3: Лог отметки и создания/удаления занятия

**Files:**
- Modify: `apps/backend/src/modules/training/dto/attendees.dto.ts`
- Modify: `apps/backend/src/modules/training/dto/create-training.dto.ts`
- Modify: `apps/backend/src/modules/training/training.controller.ts`

- [ ] **Step 1: batchId в DTO**

`attendees.dto.ts` — добавить опциональное поле:

```ts
import { IsArray, IsOptional, IsUUID } from 'class-validator'

export class AttendeesDto {
  @ApiProperty({ type: [String], description: 'id учеников' })
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds!: string[]

  @ApiPropertyOptional({ format: 'uuid', description: 'id пакета массового действия' })
  @IsOptional()
  @IsUUID()
  batchId?: string
}
```

(добавить `ApiPropertyOptional` в импорт из `@nestjs/swagger`.)

`create-training.dto.ts` — добавить такое же опциональное `batchId` (с `@IsOptional() @IsUUID()`).

- [ ] **Step 2: Логировать в контроллере**

`training.controller.ts` — внедрить `ActivityLogService` в конструктор. В `addAttendees`
после `markAttendance` залогировать каждый добавленный визит:

```ts
  @Post(':id/attendees')
  async addAttendees(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: AttendeesDto,
  ): Promise<{ training: Training; billing: BillingResult[] }> {
    const training = await this.trainingService.findOneForUser(user.id, id)
    const billing = await this.trainingService.markAttendance(training, dto.studentIds)
    const groupName = await this.activityLog.groupName(training.groupId)
    for (const b of billing) {
      const studentName = await this.activityLog.studentName(b.studentId)
      await this.activityLog.log({
        userId: user.id,
        type: 'attendance_marked',
        batchId: dto.batchId ?? null,
        trainingId: training.id,
        studentId: b.studentId,
        paymentId: b.paymentId,
        summary: {
          studentName,
          groupName,
          trainingTime: training.time,
          trainingDate: training.date,
          billing: b.billing,
          remaining: b.remaining ?? undefined,
          amount: b.amount ?? undefined,
        },
      })
    }
    return { training: await this.trainingService.findOneForUser(user.id, id), billing }
  }
```

В методе создания занятия (`@Post()` create) после создания залогировать `training_created`:

```ts
    const created = await this.trainingService.createTraining(user.id, dto)
    const groupName = await this.activityLog.groupName(created.groupId)
    await this.activityLog.log({
      userId: user.id,
      type: 'training_created',
      batchId: dto.batchId ?? null,
      trainingId: created.id,
      summary: { groupName, trainingTime: created.time, trainingDate: created.date },
    })
    return created
```

В методе удаления занятия (`@Delete(':id')`) ПЕРЕД удалением получить занятие и залогировать
`training_deleted` (view-only):

```ts
    const training = await this.trainingService.findOneForUser(user.id, id)
    const groupName = await this.activityLog.groupName(training.groupId)
    await this.trainingService.removeTraining(user.id, id)
    await this.activityLog.log({
      userId: user.id,
      type: 'training_deleted',
      trainingId: id,
      summary: { groupName, trainingTime: training.time, trainingDate: training.date },
    })
```

> Проверить фактические имена методов create/delete в контроллере и адаптировать (структуру
> взять из существующих `@Post()`/`@Delete(':id')`). Серия (recurring) создаётся фронтом
> поштучно — `batchId` свяжет события (Phase F).

- [ ] **Step 3: Проверить сборку**

Run: `npm run build -w apps/backend`
Expected: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/training
git commit -m "feat(backend): запись событий отметки/создания/удаления занятия"
```

---

### Task B4: Лог абонемента и записи оплаты

**Files:**
- Modify: add-subscription DTO (`apps/backend/src/modules/student/dto/*`)
- Modify: link-payment DTO (`apps/backend/src/modules/student/dto/*`)
- Modify: `apps/backend/src/modules/student/student.controller.ts`

- [ ] **Step 1: Найти DTO**

Открыть `student.controller.ts`, у методов `@Post(':id/subscriptions')` и
`@Post(':id/subscriptions/:subId/link-payment')` посмотреть типы `@Body()`. Открыть эти DTO.

- [ ] **Step 2: batchId в add-subscription DTO**

Добавить опциональное `batchId` (`@IsOptional() @IsUUID()`), как в Task B3.

- [ ] **Step 3: logAsPayment + summary в link-payment DTO**

В DTO link-payment (содержит `paymentId`) добавить опциональные поля для журнала ручной оплаты:

```ts
  @ApiPropertyOptional({ description: 'Логировать как событие записи оплаты (mark-paid)' })
  @IsOptional()
  @IsBoolean()
  logAsPayment?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number
```

(добавить `IsBoolean`, `IsNumber` в импорт class-validator.)

- [ ] **Step 4: Логировать в контроллере**

Внедрить `ActivityLogService`. В `addSubscription` после создания абонемента:

```ts
    const sub = await this.subscriptionsService.add(id, dto)
    const studentName = await this.activityLog.studentName(id)
    const groupName = await this.activityLog.groupName(dto.groupId)
    await this.activityLog.log({
      userId: user.id,
      type: 'subscription_created',
      batchId: dto.batchId ?? null,
      studentId: id,
      subscriptionId: sub.id,
      summary: { studentName, groupName, sessionsCount: sub.total },
    })
    return sub
```

В `link-payment` после линковки, ТОЛЬКО если `dto.logAsPayment`:

```ts
    await this.subscriptionsService.linkPayment(user.id, id, subId, dto.paymentId)
    if (dto.logAsPayment) {
      const studentName = await this.activityLog.studentName(id)
      await this.activityLog.log({
        userId: user.id,
        type: 'payment_recorded',
        studentId: id,
        subscriptionId: subId,
        paymentId: dto.paymentId,
        summary: { studentName, amount: dto.amount },
      })
    }
```

> Покупка абонемента «оплачен сразу» НЕ ставит `logAsPayment` → отдельного события оплаты нет
> (платёж отражён в событии `subscription_created`). Ручной mark-paid ставит `logAsPayment=true`.

- [ ] **Step 5: Проверить сборку**

Run: `npm run build -w apps/backend`
Expected: 0 ошибок.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/student
git commit -m "feat(backend): запись событий абонемента и ручной оплаты"
```

---

## Phase C — Бэкенд: чтение и откат

### Task C1: ActivityUndoService

**Files:**
- Create: `apps/backend/src/modules/activity-log/activity-undo.service.ts`

- [ ] **Step 1: Реализовать**

Оркестратор отката. Зависит от доменных сервисов (через `ActivityUndoModule`, который их
импортирует) + `ActivityLogService` для чтения/setUndone. Обратные операции сами зовут хуки
markUndone, но на случай недостижимого объекта явно ставим `undone_at`.

```ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import { isUndoable } from './activity-log.types'
import { ActivityLog } from './activity-log.model'
import { ActivityLogService } from './activity-log.service'
import { TrainingService } from '../training/training.service'
import { SubscriptionsService } from '../student/subscriptions.service'
import { PaymentsService } from '../finance/payments.service'
import { Subscription } from '../student/subscription.model'

@Injectable()
export class ActivityUndoService {
  constructor(
    @InjectModel(ActivityLog) private readonly model: typeof ActivityLog,
    @InjectModel(Subscription) private readonly subModel: typeof Subscription,
    private readonly activityLog: ActivityLogService,
    private readonly trainingService: TrainingService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /** Откатить одно событие. Идемпотентно: уже отменённое/view-only/недостижимое = no-op. */
  async undoOne(userId: string, id: string): Promise<void> {
    const row = await this.model.findOne({ where: { id, userId } })
    if (!row || row.undoneAt || !isUndoable(row.type)) return
    try {
      await this.performReverse(userId, row)
    } catch (e) {
      if (e instanceof NotFoundException) {
        // Объект уже удалён вручную — просто помечаем событие отменённым.
        await this.activityLog.setUndoneById(row.id)
        return
      }
      throw e
    }
    // На случай, если обратная операция не имеет хука markUndone для этого типа.
    await this.activityLog.setUndoneById(row.id)
  }

  /** Откатить все ещё активные дочерние события пакета. */
  async undoBatch(userId: string, batchId: string): Promise<void> {
    const rows = await this.model.findAll({ where: { userId, batchId } })
    for (const row of rows) {
      if (row.undoneAt || !isUndoable(row.type)) continue
      await this.undoOne(userId, row.id)
    }
  }

  private async performReverse(userId: string, row: ActivityLog): Promise<void> {
    switch (row.type) {
      case 'attendance_marked': {
        if (!row.trainingId || !row.studentId) return
        const training = await this.trainingService.findOneForUser(userId, row.trainingId)
        await this.trainingService.removeAttendee(training, row.studentId)
        return
      }
      case 'training_created': {
        if (!row.trainingId) return
        await this.trainingService.removeTraining(userId, row.trainingId)
        return
      }
      case 'subscription_created': {
        if (!row.studentId || !row.subscriptionId) return
        const sub = await this.subModel.findByPk(row.subscriptionId)
        if (sub?.finPaymentId) {
          await this.paymentsService.removePayment(userId, sub.finPaymentId).catch(() => undefined)
        }
        await this.subscriptionsService.remove(row.studentId, row.subscriptionId)
        return
      }
      case 'payment_recorded': {
        if (!row.paymentId) return
        await this.paymentsService.removePayment(userId, row.paymentId)
        return
      }
      default:
        return
    }
  }
}
```

- [ ] **Step 2: Проверить компиляцию (после Task C2/C3 модуль соберётся; пока локально)**

Run: `npm run build -w apps/backend`
Expected: возможна ошибка «provider not in a module» только при запуске — сборка типов
должна пройти. Если ругается на неиспользуемый — продолжить к C2/C3 и собрать вместе.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/activity-log/activity-undo.service.ts
git commit -m "feat(backend): ActivityUndoService — оркестрация отката"
```

---

### Task C2: DTO + контроллер журнала

**Files:**
- Create: `apps/backend/src/modules/activity-log/dto/list-activity.dto.ts`
- Create: `apps/backend/src/modules/activity-log/activity-log.controller.ts`

- [ ] **Step 1: DTO курсора**

`dto/list-activity.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class ListActivityDto {
  @ApiPropertyOptional({ description: 'created_at последней строки (ISO) для следующей порции' })
  @IsOptional()
  @IsString()
  cursor?: string
}
```

- [ ] **Step 2: Контроллер**

`activity-log.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import type { ActivityLogPageShape } from '@trikick/shared'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ActivityLogService } from './activity-log.service'
import { ActivityUndoService } from './activity-undo.service'
import { ListActivityDto } from './dto/list-activity.dto'

@ApiTags('activity-log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activity-log')
export class ActivityLogController {
  constructor(
    private readonly activityLog: ActivityLogService,
    private readonly undoService: ActivityUndoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Лента журнала действий (порциями)' })
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() q: ListActivityDto,
  ): Promise<ActivityLogPageShape> {
    const { data, nextCursor } = await this.activityLog.list(user.id, q.cursor ?? null)
    return { data: data.map((r) => this.activityLog.toShape(r)), nextCursor }
  }

  @Post(':id/undo')
  @ApiOperation({ summary: 'Откатить событие' })
  async undo(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.undoService.undoOne(user.id, id)
    return { ok: true }
  }

  @Post('batch/:batchId/undo')
  @ApiOperation({ summary: 'Откатить весь пакет' })
  async undoBatch(
    @CurrentUser() user: CurrentUserPayload,
    @Param('batchId') batchId: string,
  ): Promise<{ ok: true }> {
    await this.undoService.undoBatch(user.id, batchId)
    return { ok: true }
  }
}
```

> Проверить точные пути импортов `JwtAuthGuard` и `CurrentUserPayload` по существующему
> `training.controller.ts` и адаптировать.

- [ ] **Step 3: Проверить компиляцию**

Run: `npm run build -w apps/backend`
Expected: 0 ошибок (после C3 — регистрация модуля).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/activity-log/dto/list-activity.dto.ts apps/backend/src/modules/activity-log/activity-log.controller.ts
git commit -m "feat(backend): контроллер журнала (список + undo)"
```

---

### Task C3: ActivityUndoModule + регистрация в app.module

**Files:**
- Create: `apps/backend/src/modules/activity-log/activity-undo.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Модуль отката**

`activity-undo.module.ts` — импортирует домены (для обратных операций) + ActivityLogModule
(чтение/setUndone) + forFeature моделей, нужных undo-сервису напрямую (Subscription).

```ts
import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { Subscription } from '../student/subscription.model'
import { TrainingModule } from '../training/training.module'
import { StudentModule } from '../student/student.module'
import { FinanceModule } from '../finance/finance.module'
import { ActivityLogModule } from './activity-log.module'
import { ActivityLogController } from './activity-log.controller'
import { ActivityUndoService } from './activity-undo.service'

@Module({
  imports: [
    SequelizeModule.forFeature([Subscription]),
    ActivityLogModule,
    TrainingModule,
    StudentModule,
    FinanceModule,
  ],
  controllers: [ActivityLogController],
  providers: [ActivityUndoService],
})
export class ActivityUndoModule {}
```

> Нет цикла: `ActivityUndoModule` импортирует домены, но домены НЕ импортируют его.
> Домены импортируют только `ActivityLogModule` (запись), который не зависит от доменов.

- [ ] **Step 2: Зарегистрировать в app.module.ts**

В `imports` массив `AppModule` добавить (после `CalendarModule`):

```ts
import { ActivityLogModule } from './modules/activity-log/activity-log.module'
import { ActivityUndoModule } from './modules/activity-log/activity-undo.module'
// ... в imports:
    ActivityLogModule,
    ActivityUndoModule,
```

- [ ] **Step 3: Собрать и запустить бэк (smoke)**

Run: `npm run build -w apps/backend`
Expected: 0 ошибок.

Run: `npm test -w apps/backend`
Expected: все jest зелёные (вкл. `activity-log.types`), без падений регистрации DI.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/activity-log/activity-undo.module.ts apps/backend/src/app.module.ts
git commit -m "feat(backend): ActivityUndoModule + регистрация журнала в приложении"
```

---

## Phase D — Фронтенд: модуль entities/activity-log + чистая логика

### Task D1: Типы и репозиторий

**Files:**
- Create: `apps/frontend/src/entities/activity-log/model/types.ts`
- Create: `apps/frontend/src/entities/activity-log/model/activity-log.repo.ts`

- [ ] **Step 1: Типы**

`model/types.ts`:

```ts
import type { ActivityLogEntryShape, ActivityType } from '@trikick/shared'

export type ActivityEntry = ActivityLogEntryShape
export type { ActivityType }
```

- [ ] **Step 2: Репозиторий**

`model/activity-log.repo.ts`:

```ts
import { apiClient } from 'common/services/api/api-client'

import type { ActivityEntry } from './types'

interface ActivityPage {
  data: ActivityEntry[]
  nextCursor: string | null
}

export async function getActivityLog(cursor: string | null): Promise<ActivityPage> {
  return apiClient.get<ActivityPage>('/activity-log', cursor ? { cursor } : undefined)
}

export async function undoEvent(id: string): Promise<void> {
  await apiClient.post(`/activity-log/${id}/undo`)
}

export async function undoBatch(batchId: string): Promise<void> {
  await apiClient.post(`/activity-log/batch/${batchId}/undo`)
}
```

- [ ] **Step 3: Проверить сборку фронта**

Run: `npm run build -w apps/frontend`
Expected: 0 ошибок (модуль ещё не подключён — норм).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/entities/activity-log/model/types.ts apps/frontend/src/entities/activity-log/model/activity-log.repo.ts
git commit -m "feat(frontend): репозиторий журнала действий"
```

---

### Task D2: Чистый маппинг события → иконка/текст + vitest

**Files:**
- Create: `apps/frontend/src/entities/activity-log/model/describe-event.ts`
- Test: `apps/frontend/src/entities/activity-log/model/describe-event.spec.ts`

- [ ] **Step 1: Тест**

`model/describe-event.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { describeEvent } from './describe-event'

import type { ActivityEntry } from './types'

const base: ActivityEntry = {
  id: '1',
  type: 'attendance_marked',
  batchId: null,
  createdAt: '2026-06-15T08:00:00.000Z',
  undoneAt: null,
  trainingId: 't1',
  studentId: 's1',
  subscriptionId: null,
  paymentId: null,
  summary: { studentName: 'Маша', groupName: 'Старт', billing: 'subscription', remaining: 3 },
}

describe('describeEvent', () => {
  it('отметка по абонементу — иконка ✅, упоминает остаток', () => {
    const r = describeEvent(base)
    expect(r.icon).toBe('✅')
    expect(r.title).toContain('Маша')
    expect(r.detail).toContain('3')
    expect(r.undoable).toBe(true)
  })

  it('отметка платежом — деталь содержит сумму', () => {
    const r = describeEvent({ ...base, summary: { studentName: 'Петя', groupName: 'Старт', billing: 'payment', amount: 1200 } })
    expect(r.detail).toContain('1200')
  })

  it('удаление занятия — не обратимо', () => {
    const r = describeEvent({ ...base, type: 'training_deleted', summary: { groupName: 'Старт' } })
    expect(r.icon).toBe('🗑')
    expect(r.undoable).toBe(false)
  })

  it('отменённое событие помечено флагом', () => {
    const r = describeEvent({ ...base, undoneAt: '2026-06-15T09:00:00.000Z' })
    expect(r.undone).toBe(true)
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npm test -w apps/frontend -- describe-event`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

`model/describe-event.ts` (тексты — заготовки на русском; в UI будут перекрыты i18n-обёрткой
в Task E1, здесь чистая функция формирует структуру, не финальные строки):

```ts
import type { ActivityEntry, ActivityType } from './types'

export interface EventView {
  icon: string
  title: string
  detail: string
  undoable: boolean
  undone: boolean
}

const ICONS: Record<ActivityType, string> = {
  attendance_marked: '✅',
  subscription_created: '🔄',
  payment_recorded: '💳',
  training_created: '➕',
  training_deleted: '🗑',
}

export function describeEvent(e: ActivityEntry): EventView {
  const s = e.summary
  const name = s.studentName ?? ''
  const group = s.groupName ?? ''
  let title = name
  let detail = ''
  switch (e.type) {
    case 'attendance_marked':
      title = group ? `${name} · «${group}»` : name
      detail =
        s.billing === 'subscription'
          ? `списано занятие, осталось ${s.remaining ?? 0}`
          : s.billing === 'payment'
            ? `платёж ${s.amount ?? 0} ₽`
            : 'без списания'
      break
    case 'subscription_created':
      title = group ? `${name} · «${group}»` : name
      detail = `абонемент ${s.sessionsCount ?? 0} занятий`
      break
    case 'payment_recorded':
      title = name
      detail = `оплата ${s.amount ?? 0} ₽`
      break
    case 'training_created':
      title = `Создано занятие «${group}»`
      detail = s.trainingTime ?? ''
      break
    case 'training_deleted':
      title = `Удалено занятие «${group}»`
      detail = s.trainingTime ?? ''
      break
  }
  return {
    icon: ICONS[e.type],
    title,
    detail,
    undoable: e.type !== 'training_deleted' && !e.undoneAt,
    undone: !!e.undoneAt,
  }
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `npm test -w apps/frontend -- describe-event`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/entities/activity-log/model/describe-event.ts apps/frontend/src/entities/activity-log/model/describe-event.spec.ts
git commit -m "feat(frontend): describeEvent + vitest"
```

---

### Task D3: Чистая группировка ленты (дни + пакеты) + vitest

**Files:**
- Create: `apps/frontend/src/entities/activity-log/model/group-log.ts`
- Test: `apps/frontend/src/entities/activity-log/model/group-log.spec.ts`

- [ ] **Step 1: Тест**

`model/group-log.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { groupByDayAndBatch } from './group-log'

import type { ActivityEntry } from './types'

const ev = (over: Partial<ActivityEntry>): ActivityEntry => ({
  id: Math.random().toString(),
  type: 'attendance_marked',
  batchId: null,
  createdAt: '2026-06-15T08:00:00.000Z',
  undoneAt: null,
  trainingId: 't',
  studentId: 's',
  subscriptionId: null,
  paymentId: null,
  summary: {},
  ...over,
})

describe('groupByDayAndBatch', () => {
  it('разбивает по локальным дням', () => {
    const days = groupByDayAndBatch([
      ev({ createdAt: '2026-06-15T08:00:00.000Z' }),
      ev({ createdAt: '2026-06-14T08:00:00.000Z' }),
    ])
    expect(days).toHaveLength(2)
    expect(days[0].date).toBe('2026-06-15')
  })

  it('события одного batchId внутри дня — в группу', () => {
    const [day] = groupByDayAndBatch([
      ev({ batchId: 'b1', id: '1' }),
      ev({ batchId: 'b1', id: '2' }),
      ev({ batchId: null, id: '3' }),
    ])
    const batchItems = day.items.filter((i) => i.kind === 'batch')
    const singleItems = day.items.filter((i) => i.kind === 'single')
    expect(batchItems).toHaveLength(1)
    expect(batchItems[0].kind === 'batch' && batchItems[0].children).toHaveLength(2)
    expect(singleItems).toHaveLength(1)
  })

  it('пакет из одного события показывается плоско (single)', () => {
    const [day] = groupByDayAndBatch([ev({ batchId: 'solo', id: '1' })])
    expect(day.items[0].kind).toBe('single')
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `npm test -w apps/frontend -- group-log`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

`model/group-log.ts`:

```ts
import type { ActivityEntry } from './types'

export interface SingleItem {
  kind: 'single'
  event: ActivityEntry
}

export interface BatchItem {
  kind: 'batch'
  batchId: string
  children: ActivityEntry[]
}

export type LogItem = SingleItem | BatchItem

export interface LogDay {
  date: string
  items: LogItem[]
}

/** Локальная дата YYYY-MM-DD из ISO. */
function localDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Группирует уже отсортированные по убыванию события: сначала по локальному дню,
 * внутри дня — последовательные события с одним batchId в пакет (пакет из одного → single).
 */
export function groupByDayAndBatch(events: ActivityEntry[]): LogDay[] {
  const days: LogDay[] = []
  let curDay: LogDay | null = null

  // Предподсчёт размеров пакетов, чтобы пакет из одного показать плоско.
  const batchCount = new Map<string, number>()
  for (const e of events) {
    if (e.batchId) batchCount.set(e.batchId, (batchCount.get(e.batchId) ?? 0) + 1)
  }

  for (const e of events) {
    const date = localDate(e.createdAt)
    if (!curDay || curDay.date !== date) {
      curDay = { date, items: [] }
      days.push(curDay)
    }
    const isRealBatch = e.batchId && (batchCount.get(e.batchId) ?? 0) > 1
    if (isRealBatch) {
      const last = curDay.items[curDay.items.length - 1]
      if (last && last.kind === 'batch' && last.batchId === e.batchId) {
        last.children.push(e)
      } else {
        curDay.items.push({ kind: 'batch', batchId: e.batchId as string, children: [e] })
      }
    } else {
      curDay.items.push({ kind: 'single', event: e })
    }
  }
  return days
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `npm test -w apps/frontend -- group-log`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/entities/activity-log/model/group-log.ts apps/frontend/src/entities/activity-log/model/group-log.spec.ts
git commit -m "feat(frontend): группировка ленты журнала + vitest"
```

---

### Task D4: react-query хуки (infinite + undo)

**Files:**
- Create: `apps/frontend/src/entities/activity-log/api/use-activity-log.ts`
- Create: `apps/frontend/src/entities/activity-log/index.ts`

- [ ] **Step 1: Хуки**

`api/use-activity-log.ts` (первый `useInfiniteQuery` в проекте — структура ниже):

```ts
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { studentKeys } from 'entities/students'
import { trainingKeys } from 'entities/trainings'

import { getActivityLog, undoBatch, undoEvent } from '../model/activity-log.repo'

export const activityKeys = {
  all: ['activity-log'] as const,
}

export function useActivityLog() {
  return useInfiniteQuery({
    queryKey: activityKeys.all,
    queryFn: ({ pageParam }) => getActivityLog(pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })
}

/** Инвалидация всего, что мог затронуть откат: журнал + визиты + ученики + финансы. */
function useInvalidateAfterUndo() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: activityKeys.all })
    qc.invalidateQueries({ queryKey: trainingKeys.all })
    qc.invalidateQueries({ queryKey: studentKeys.all })
    qc.invalidateQueries({ queryKey: ['finance'] })
  }
}

export function useUndoEvent() {
  const invalidate = useInvalidateAfterUndo()
  return useMutation({
    mutationFn: (id: string) => undoEvent(id),
    onSuccess: invalidate,
  })
}

export function useUndoBatch() {
  const invalidate = useInvalidateAfterUndo()
  return useMutation({
    mutationFn: (batchId: string) => undoBatch(batchId),
    onSuccess: invalidate,
  })
}
```

> Проверить точные query-keys финансов в `entities/finance` (например `financeKeys`/`['finance']`)
> и подставить фактический ключ вместо `['finance']`.

- [ ] **Step 2: Barrel**

`index.ts`:

```ts
export * from './api/use-activity-log'
export * from './model/activity-log.repo'
export * from './model/describe-event'
export * from './model/group-log'
export * from './model/types'
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build -w apps/frontend`
Expected: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/entities/activity-log/api/use-activity-log.ts apps/frontend/src/entities/activity-log/index.ts
git commit -m "feat(frontend): хуки журнала (infinite + undo)"
```

---

## Phase E — Фронтенд: экран, маршрут, меню, i18n

### Task E1: i18n-ключи

**Files:**
- Modify: `apps/frontend/src/locales/ru/translation.json`
- Modify: `apps/frontend/src/locales/en/translation.json`

- [ ] **Step 1: Добавить ключи (ru)**

В `nav` добавить `"journal": "Журнал"`. Добавить новую секцию верхнего уровня `journal`:

```json
"journal": {
  "title": "Журнал",
  "empty": "Пока нет событий",
  "emptyText": "Здесь появятся ваши действия — отметки, оплаты, абонементы",
  "today": "Сегодня",
  "yesterday": "Вчера",
  "undo": "Отменить",
  "undoAll": "Отменить всё",
  "undone": "Отменено",
  "undoneToast": "Отменено",
  "redo": "Вернуть",
  "loadMore": "Показать ещё",
  "batchMarks": "Закрыт день · {{count}} отметок",
  "batchSeries": "Создана серия · {{count}} занятий",
  "icon": {
    "attendanceSub": "списано занятие, осталось {{count}}",
    "attendancePay": "платёж {{amount}} ₽",
    "subscription": "абонемент {{count}} занятий",
    "payment": "оплата {{amount}} ₽",
    "created": "Создано занятие «{{group}}»",
    "deleted": "Удалено занятие «{{group}}»"
  }
}
```

- [ ] **Step 2: Добавить ключи (en)**

Зеркально в `en/translation.json`: `nav.journal = "Journal"` и секция `journal` с английскими
переводами (для `batchMarks`/`batchSeries`/`icon.*count*` использовать английскую плюрализацию:
базовый ключ + `_other`, как у существующих счётчиков).

```json
"journal": {
  "title": "Journal",
  "empty": "No events yet",
  "emptyText": "Your actions will appear here — check-ins, payments, subscriptions",
  "today": "Today",
  "yesterday": "Yesterday",
  "undo": "Undo",
  "undoAll": "Undo all",
  "undone": "Undone",
  "undoneToast": "Undone",
  "redo": "Redo",
  "loadMore": "Show more",
  "batchMarks": "Day closed · {{count}} check-in",
  "batchMarks_other": "Day closed · {{count}} check-ins",
  "batchSeries": "Series created · {{count}} session",
  "batchSeries_other": "Series created · {{count}} sessions",
  "icon": {
    "attendanceSub": "session deducted, {{count}} left",
    "attendancePay": "payment {{amount}} ₽",
    "subscription": "subscription, {{count}} sessions",
    "payment": "payment {{amount}} ₽",
    "created": "Training created «{{group}}»",
    "deleted": "Training deleted «{{group}}»"
  }
}
```

- [ ] **Step 3: Проверить валидность JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('apps/frontend/src/locales/ru/translation.json','utf8'));JSON.parse(require('fs').readFileSync('apps/frontend/src/locales/en/translation.json','utf8'));console.log('OK')"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/locales
git commit -m "feat(frontend): i18n-ключи журнала (ru/en)"
```

---

### Task E2: Экран журнала

**Files:**
- Create: `apps/frontend/src/pages/journal/journal-page.tsx`
- Create: `apps/frontend/src/pages/journal/journal-page.scss`
- Create: `apps/frontend/src/pages/journal/index.ts`

- [ ] **Step 1: Страница**

`journal-page.tsx`. Использует `useActivityLog` (infinite), `groupByDayAndBatch`,
`describeEvent`; состояния через `ListSkeleton`/`EmptyState`/`ErrorState`; локальный
`expanded` для пакетов; тост через `useToast` (без action-кнопки — «Вернуть» отдельной
ссылкой в самой строке отменённого; см. примечание).

```tsx
import { useMemo, useState } from 'react'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'

import { EmptyState, ErrorState, ListSkeleton, PageHeader, useToast } from 'common/ui'
import {
  describeEvent,
  groupByDayAndBatch,
  useActivityLog,
  useUndoBatch,
  useUndoEvent,
} from 'entities/activity-log'

import type { ActivityEntry } from 'entities/activity-log'

import './journal-page.scss'

export function JournalPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useActivityLog()
  const undoEvent = useUndoEvent()
  const undoBatch = useUndoBatch()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const days = useMemo(() => {
    const all = (data?.pages ?? []).flatMap((p) => p.data)
    return groupByDayAndBatch(all)
  }, [data])

  const onUndo = async (id: string) => {
    await undoEvent.mutateAsync(id)
    toast({ type: 'success', title: t('journal.undoneToast') })
  }
  const onUndoBatch = async (batchId: string) => {
    await undoBatch.mutateAsync(batchId)
    toast({ type: 'success', title: t('journal.undoneToast') })
  }
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const renderEvent = (e: ActivityEntry, inBatch: boolean) => {
    const v = describeEvent(e)
    return (
      <div key={e.id} className={`jr-row${v.undone ? ' jr-row--undone' : ''}${inBatch ? ' jr-row--child' : ''}`}>
        <span className="jr-row__icon">{v.icon}</span>
        <div className="jr-row__body">
          <div className="jr-row__title">{v.title}</div>
          {v.detail && <div className="jr-row__detail">{v.detail}</div>}
        </div>
        {v.undone ? (
          <span className="jr-row__undone">{t('journal.undone')}</span>
        ) : v.undoable ? (
          <Button size="small" type="text" onClick={() => onUndo(e.id)}>
            {t('journal.undo')}
          </Button>
        ) : null}
      </div>
    )
  }

  if (isLoading) return <div><PageHeader title={t('journal.title')} /><ListSkeleton /></div>
  if (isError) return <div><PageHeader title={t('journal.title')} /><ErrorState onRetry={refetch} /></div>

  return (
    <div className="journal-page">
      <PageHeader title={t('journal.title')} />
      {days.length === 0 ? (
        <EmptyState title={t('journal.empty')} text={t('journal.emptyText')} />
      ) : (
        days.map((day) => (
          <section key={day.date} className="jr-day">
            <div className="jr-day__label">{day.date}</div>
            {day.items.map((item) =>
              item.kind === 'single' ? (
                renderEvent(item.event, false)
              ) : (
                <div key={item.batchId} className="jr-batch">
                  <div className="jr-batch__head" onClick={() => toggle(item.batchId)}>
                    <span className="jr-batch__caret">{expanded.has(item.batchId) ? '▾' : '▸'}</span>
                    <span className="jr-batch__title">
                      {t('journal.batchMarks', { count: item.children.length })}
                    </span>
                    <Button size="small" type="text" onClick={(ev) => { ev.stopPropagation(); onUndoBatch(item.batchId) }}>
                      {t('journal.undoAll')}
                    </Button>
                  </div>
                  {expanded.has(item.batchId) && item.children.map((c) => renderEvent(c, true))}
                </div>
              ),
            )}
          </section>
        ))
      )}
      {hasNextPage && (
        <div className="jr-more">
          <Button onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
            {t('journal.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}
```

> Примечание к «Вернуть»: antd-тост проекта не поддерживает action-кнопку (см. контекст).
> В v1 тост подтверждает «Отменено» без кнопки; полноценный redo/«Вернуть» — отдельная
> задача (вне этого плана), чтобы не раздувать скоуп. Метка «Отменено» в строке остаётся.
> Дата дня (`day.date`) отображается как есть (YYYY-MM-DD); человекочитаемые «Сегодня/Вчера»
> — необязательная полировка, ключи уже заведены.

- [ ] **Step 2: Стили**

`journal-page.scss` — на токенах `--tk-`/`--sp-`/`--r-` (по образцу других экранов):

```scss
.journal-page {
  .jr-day__label {
    font-size: 0.8rem;
    color: var(--tk-text-tertiary);
    text-transform: uppercase;
    margin: var(--sp-4) 0 var(--sp-2);
  }
  .jr-row {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3);
    border: 1px solid var(--tk-border);
    border-radius: var(--r-2);
    margin-bottom: var(--sp-2);
    &--child { margin-left: var(--sp-5); }
    &--undone { opacity: 0.55; .jr-row__title { text-decoration: line-through; } }
    &__icon { font-size: 1.1rem; }
    &__body { flex: 1; min-width: 0; }
    &__title { font-weight: 600; }
    &__detail { font-size: 0.85rem; color: var(--tk-text-secondary); }
    &__undone { font-size: 0.8rem; color: var(--tk-text-tertiary); }
  }
  .jr-batch {
    border: 1px solid var(--tk-border);
    border-radius: var(--r-2);
    margin-bottom: var(--sp-2);
    &__head {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-3);
      cursor: pointer;
    }
    &__title { flex: 1; font-weight: 600; }
    .jr-row { border: none; margin: 0; border-top: 1px solid var(--tk-border); border-radius: 0; }
  }
  .jr-more { display: flex; justify-content: center; margin: var(--sp-4) 0; }
}
```

- [ ] **Step 3: Barrel**

`index.ts`:

```ts
export { JournalPage } from './journal-page'
```

- [ ] **Step 4: Проверить сборку**

Run: `npm run build -w apps/frontend`
Expected: 0 ошибок (страница ещё не в роутере — норм).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/journal
git commit -m "feat(frontend): экран журнала действий"
```

---

### Task E3: Маршрут + пункт меню профиля

**Files:**
- Modify: `apps/frontend/src/app/routes.tsx`
- Modify: `apps/frontend/src/app/layout/profile-menu.tsx`

- [ ] **Step 1: Маршрут**

В `routes.tsx` добавить ленивый импорт рядом с остальными:

```ts
const JournalPage = lazy(() => import('pages/journal').then((m) => ({ default: m.JournalPage })))
```

и в `children` внутри `AppLayout` (рядом с `finance`/`settings`):

```ts
          { path: 'journal', element: lazyEl(<JournalPage />) },
```

- [ ] **Step 2: Пункт меню**

В `profile-menu.tsx` добавить импорт иконки и пункт ПЕРЕД `{ type: 'divider' }`:

```ts
import { BulbOutlined, HistoryOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons'
// ...
    {
      key: 'journal',
      icon: <HistoryOutlined />,
      label: t('nav.journal'),
      onClick: () => navigate('/journal'),
    },
```

- [ ] **Step 3: Проверить сборку + eslint**

Run: `npm run build -w apps/frontend`
Expected: 0 ошибок.

Run: `npx eslint apps/frontend/src --quiet`
Expected: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/routes.tsx apps/frontend/src/app/layout/profile-menu.tsx
git commit -m "feat(frontend): маршрут /journal + пункт меню профиля"
```

---

## Phase F — Фронтенд: проброс batchId в массовые действия

### Task F1: batchId-хелпер + сигнатуры репозитория

**Files:**
- Create: `apps/frontend/src/common/utils/batch-id.ts`
- Modify: `apps/frontend/src/entities/trainings/model/trainings.repo.ts`
- Modify: `apps/frontend/src/entities/trainings/model/training-logic.ts`

- [ ] **Step 1: Хелпер**

`common/utils/batch-id.ts` (использовать существующий генератор uuid из `common/utils/uuid`):

```ts
import { uuid } from './uuid'

/** Новый id пакета для одного пользовательского массового действия. */
export function newBatchId(): string {
  return uuid()
}
```

> Проверить имя экспорта в `common/utils/uuid` и подставить фактическое.

- [ ] **Step 2: batchId в addAttendees/createTraining (repo)**

В `trainings.repo.ts`:

`addAttendees` — добавить опциональный аргумент `batchId` и положить в тело:

```ts
export async function addAttendees(
  trainingId: string,
  studentIds: string[],
  batchId?: string,
): Promise<{ training: Training | null; billing: BillingResult[] }> {
  const res = await apiClient.post<{ training: RawTraining; billing: BillingResult[] }>(
    `/trainings/${trainingId}/attendees`,
    { studentIds, batchId },
  )
  // ... существующая нормализация
}
```

`createTraining` — добавить `batchId` в тело из `data`:

```ts
export async function createTraining(data: TrainingInput): Promise<Training> {
  const raw = await apiClient.post<RawTraining>('/trainings', {
    // ... существующие поля
    batchId: data.batchId,
  })
  // ...
}
```

и в тип `TrainingInput` добавить `batchId?: string`.

- [ ] **Step 3: проброс в markAttendance (training-logic)**

В `training-logic.ts` функция `markAttendance(training, studentIds)` вызывает `addAttendees`.
Добавить третий опциональный аргумент `batchId` и пробросить в `addAttendees`:

```ts
export async function markAttendance(
  training: Training,
  studentIds: string[],
  batchId?: string,
): Promise<MarkResult[]> {
  // ... вызвать addAttendees(training.id, studentIds, batchId)
}
```

- [ ] **Step 4: Проверить сборку**

Run: `npm run build -w apps/frontend`
Expected: 0 ошибок (опциональные аргументы не ломают вызывающих).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/common/utils/batch-id.ts apps/frontend/src/entities/trainings/model/trainings.repo.ts apps/frontend/src/entities/trainings/model/training-logic.ts
git commit -m "feat(frontend): batchId в addAttendees/createTraining/markAttendance"
```

---

### Task F2: batchId в «Закрыть день»/быстрой отметке

**Files:**
- Modify: `apps/frontend/src/pages/home/use-day-marking.ts`

- [ ] **Step 1: Сгенерировать один batchId на сохранение**

В `use-day-marking.ts`, в начале `save`, после `setSaving(true)` создать `const batchId = newBatchId()`
(импорт `import { newBatchId } from 'common/utils/batch-id'`).

- [ ] **Step 2: Пробросить в markAttendance**

В обоих местах вызова `markAttendance(training, toAdd)` и `markAttendance(tr, [ti.studentId])`
добавить третий аргумент `batchId`:

```ts
const results = await markAttendance(training, toAdd, batchId)
// ...
const results = await markAttendance(tr, [ti.studentId], batchId)
```

(removeAttendee не трогаем — он помечает исходное событие отменённым на бэке.)

- [ ] **Step 3: Проверить сборку**

Run: `npm run build -w apps/frontend`
Expected: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/pages/home/use-day-marking.ts
git commit -m "feat(frontend): один batchId на сохранение дня/быстрой отметки"
```

---

### Task F3: batchId в сериях занятий и отметке календаря

**Files:**
- Modify: `apps/frontend/src/entities/trainings/form/use-individual-session.ts`
- Modify: `apps/frontend/src/entities/trainings/form/use-pair-session.ts`
- Modify: `apps/frontend/src/entities/trainings/form/use-calendar-training.ts`

- [ ] **Step 1: Серия индивидуальных/парных**

В `use-individual-session.ts` и `use-pair-session.ts` — там, где цикл по `dates` создаёт
занятия, сгенерировать ОДИН `const batchId = newBatchId()` ДО цикла и передавать его в каждый
`createTraining.mutateAsync({ ..., batchId })`. Для одиночного занятия (длина серии 1) batchId
тоже ставится — на бэке пакет из одного покажется плоско.

- [ ] **Step 2: Отметка из календаря**

В `use-calendar-training.ts` метод `saveAttendance` — сгенерировать `batchId` и передать в
`markAttendance(current, toAdd, batchId)`.

- [ ] **Step 3: Проверить сборку + eslint**

Run: `npm run build -w apps/frontend`
Expected: 0 ошибок.

Run: `npx eslint apps/frontend/src --quiet`
Expected: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/entities/trainings/form/use-individual-session.ts apps/frontend/src/entities/trainings/form/use-pair-session.ts apps/frontend/src/entities/trainings/form/use-calendar-training.ts
git commit -m "feat(frontend): batchId для серий занятий и отметки из календаря"
```

---

### Task F4: logAsPayment в ручной оплате

**Files:**
- Modify: `apps/frontend/src/entities/students/model/students.repo.ts`
- Modify: `apps/frontend/src/entities/finance/form/mark-paid-modal.tsx`

- [ ] **Step 1: Расширить linkPaymentToSub**

В `students.repo.ts` функция `linkPaymentToSub(studentId, subId, paymentId)` — добавить
опциональные `logAsPayment` и `amount`, положить в тело:

```ts
export async function linkPaymentToSub(
  studentId: string,
  subId: string,
  paymentId: string,
  opts?: { logAsPayment?: boolean; amount?: number },
): Promise<void> {
  await apiClient.post(`/students/${studentId}/subscriptions/${subId}/link-payment`, {
    paymentId,
    logAsPayment: opts?.logAsPayment,
    amount: opts?.amount,
  })
}
```

- [ ] **Step 2: Передать флаг из mark-paid**

В `mark-paid-modal.tsx`, в `submit`, вызов `linkPaymentToSub(student.id, sub.id, payment.id)`
заменить на:

```ts
await linkPaymentToSub(student.id, sub.id, payment.id, { logAsPayment: true, amount })
```

(`amount` — сумма платежа, уже есть в области видимости submit.)

> Авто-линковка при покупке абонемента (`renew-sub-modal`, `use-individual-session`) НЕ
> передаёт `logAsPayment` → событие записи оплаты там не создаётся (платёж отражён в
> `subscription_created`). Не трогаем их.

- [ ] **Step 3: Проверить сборку**

Run: `npm run build -w apps/frontend`
Expected: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/entities/students/model/students.repo.ts apps/frontend/src/entities/finance/form/mark-paid-modal.tsx
git commit -m "feat(frontend): mark-paid логирует событие записи оплаты"
```

---

## Phase G — Финальный гейт и проверка

### Task G1: Полный гейт

- [ ] **Step 1: Бэк-тесты**

Run: `npm test -w apps/backend`
Expected: все зелёные (вкл. `activity-log.types`).

- [ ] **Step 2: Фронт-тесты**

Run: `npm test -w apps/frontend`
Expected: все зелёные (вкл. `describe-event`, `group-log`).

- [ ] **Step 3: Сборки**

Run: `npm run build -w apps/backend`
Run: `npm run build -w apps/frontend`
Expected: 0 ошибок обе.

- [ ] **Step 4: eslint**

Run: `npx eslint apps/frontend/src --quiet`
Expected: 0 ошибок.

- [ ] **Step 5: Локали синхронны**

Run: `node -e "const r=require('./apps/frontend/src/locales/ru/translation.json');const e=require('./apps/frontend/src/locales/en/translation.json');const keys=o=>{const s=new Set();const go=(p,x)=>{for(const k in x){const np=p?p+'.'+k:k;typeof x[k]==='object'&&x[k]?go(np,x[k]):s.add(np)}};go('',o);return s};const rk=keys(r),ek=keys(e);const miss=[...rk].filter(k=>!ek.has(k)&&!ek.has(k.replace(/_(few|many|one)$/,'_other'))&&!ek.has(k.replace(/_(few|many)$/,'')));console.log('в ru нет в en (без учёта плюралей):',miss.filter(k=>!/_(few|many)$/.test(k)))"`
Expected: пустой список (плюральные расхождения ru `_few/_many` vs en `_other` — норма).

### Task G2: Ручная проверка на демо (чек-лист)

- [ ] Поднять стек: MySQL (brew), `npm run start:dev -w apps/backend`, `npm run dev`. Вход demo@trikick.ru/demo1234.
- [ ] Меню профиля → «Журнал» → открывается экран `/journal`.
- [ ] Отметить ученика (через быструю отметку) → в журнале строка `✅ … списано занятие`; «Отменить» → в Финансах/абонементе откат виден; строка помечена «Отменено».
- [ ] «Закрыть день» (несколько отметок) → в журнале пакет «Закрыт день · N отметок» с раскрытием; «Отменить всё» откатывает все; повторно — раскрыть и отменить одну.
- [ ] Создать серию индивидуальных занятий → пакет с раскрытием в журнале.
- [ ] Продлить абонемент с «Оплачен сразу» → событие `🔄 абонемент`; «Отменить» удаляет абонемент и его платёж (проверить Финансы).
- [ ] «Записать оплату» (mark-paid) → событие `💳 оплата`; «Отменить» удаляет платёж, абонемент → «Ожидают оплаты».
- [ ] Удалить занятие → строка `🗑 Удалено занятие` БЕЗ кнопки «Отменить».
- [ ] Мобайл ≤768px: журнал листается, пакеты раскрываются, «Показать ещё» подгружает.
- [ ] Откатить отметку из календарной модалки (снять галочку) → в журнале соответствующее событие стало «Отменено» (хук markUndone).

### Task G3: Обновить ARCHITECTURE.md и память

- [ ] Добавить строку фичи в `docs/ARCHITECTURE.md` §7 (журнал действий + отмена, таблица `activity_logs`, ActivityLog/ActivityUndo модули, экран `/journal`). Отметить новый модуль в §3/§4.
- [ ] Commit: `docs: ARCHITECTURE — журнал действий + отмена`.

---

## Self-Review плана (выполнено автором)

- **Покрытие спеки:** §2 скоуп → Tasks B3/B4 (типы событий) + describeEvent. §3 отмена/идемпотентность
  → ActivityUndoService (no-op на undone/недостижимом) + markUndone-хуки. §4 группировка → group-log
  + экран (batch с раскрытием). §5 строка события → describeEvent + i18n. §6 модель → миграция A2 +
  модель A3 (summary JSON, soft-ссылки). §7 запись/чтение/undo → Phase B/C. §8 фронт → Phase D/E.
  §9 дефолты (без фильтров/хранить всё/глобальный) → реализовано (лента без фильтров, пагинация).
  §10 тесты → jest (isUndoable) + vitest (describeEvent, group-log) + гейт G1. §11 ловушки →
  batchId фронт (Phase F), UTC (group-log по локальной дате), инвалидация (useInvalidateAfterUndo),
  groupId=имя (groupName-резолв в сервисе).
- **Расхождение со спекой (осознанное):** тост «Вернуть»/redo вынесен из v1 (antd-тост проекта
  без action-кнопки; redo = отдельная задача), метка «Отменено» сохранена. Отмечено в Task E2.
  Если нужен redo в v1 — добавить отдельную фазу позже.
- **Согласованность типов:** `ActivityType`/`ActivityLogEntryShape`/`ActivitySummary` (shared) →
  модель (A3) → сервис toShape (A5) → фронт types (D1) → describeEvent/group-log. `batchId`
  единообразно опционален во всех DTO и repo. `BillingResult.amount/paymentId` (B1) → лог (B3).
- **Циклы модулей:** домены → ActivityLogModule (запись); ActivityUndoModule → домены (откат).
  Однонаправленно, цикла нет.

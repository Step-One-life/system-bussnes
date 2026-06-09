# Единая отметка ⇄ деньги на бэкенде — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вся денежная логика отметки посещения (списание абонемента ИЛИ авто-платёж по тарифу) переезжает в backend `markAttendance`; визит записывает результат биллинга, откат отменяет ровно то, что было сделано; все 4 точки UI ходят в одни эндпоинты.

**Architecture:** Подход «визит помнит, чем оплачен»: `visits` получает `billing`/`subscription_id`/`payment_id`; чистая функция `attendancePricing` маппит тренировку в кортеж тарифа и тип платежа; `removeAttendee`/`removeTraining`/`removeSeries` откатывают через общий `revertVisit`. Спека: `docs/superpowers/specs/2026-06-10-unified-attendance-billing-design.md`.

**Tech Stack:** NestJS + Sequelize (sequelize-cli миграции), jest (чистые функции), React + react-query на фронте.

**Конвенции:** без точек с запятой, одинарные кавычки, отступ 2 пробела. Ветка `feat/unified-attendance-billing` (уже создана).

---

## Карта файлов

**Backend:**
- Create: `apps/backend/database/migrations/20260610000001-add-billing-to-visits.js`
- Create: `apps/backend/src/modules/training/lib/attendance-pricing.ts` (+ `.spec.ts`)
- Modify: `apps/backend/src/modules/student/visit.model.ts` — поля биллинга
- Modify: `apps/backend/src/modules/student/subscriptions.service.ts` — `restoreById`
- Modify: `apps/backend/src/modules/training/training.service.ts` — биллинг в `markAttendance`, `revertVisit`
- Modify: `apps/backend/src/modules/training/training.module.ts` — импорт FinanceModule, GroupModule
- Modify: `apps/backend/src/modules/training/training.controller.ts` — ответ `{ training, billing }`

**Frontend:**
- Modify: `apps/frontend/src/entities/trainings/model/trainings.repo.ts` — `addAttendees` → `{ training, billing }`
- Modify: `apps/frontend/src/entities/trainings/model/training-logic.ts` — `markAttendance` тонкая обёртка, удалить `markAttendanceWithPayment`
- Modify: `apps/frontend/src/entities/trainings/form/use-calendar-training.ts` — на эндпоинты
- Modify: `apps/frontend/src/entities/trainings/api/use-training-actions.ts` — убрать ручной откат
- Modify: `apps/frontend/src/pages/home/use-mark-today.ts`, `apps/frontend/src/entities/trainings/form/use-add-to-training.ts`, `apps/frontend/src/entities/trainings/form/use-group-training.ts` — новый `MarkResult`, предупреждение «нет тарифа»
- Возможно удалить: `restoreSession`/`removeVisit` из `apps/frontend/src/entities/students/model/students.repo.ts` (если не останется использований)

---

### Task 1: Миграция и модель визита

**Files:**
- Create: `apps/backend/database/migrations/20260610000001-add-billing-to-visits.js`
- Modify: `apps/backend/src/modules/student/visit.model.ts`

- [ ] **Step 1: Создать миграцию**

```js
'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // billing: 'subscription' | 'payment' | 'none'; NULL = легаси-визит до миграции
    await queryInterface.addColumn('visits', 'billing', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('visits', 'subscription_id', {
      type: Sequelize.UUID,
      allowNull: true,
    })
    await queryInterface.addColumn('visits', 'payment_id', {
      type: Sequelize.UUID,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('visits', 'payment_id')
    await queryInterface.removeColumn('visits', 'subscription_id')
    await queryInterface.removeColumn('visits', 'billing')
  },
}
```

- [ ] **Step 2: Прогнать миграцию локально**

Run: `npm run migrate -w apps/backend`
Expected: `== 20260610000001-add-billing-to-visits: migrated`

- [ ] **Step 3: Дополнить `visit.model.ts`**

Полное новое содержимое файла:

```ts
import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript'

import { BaseEntity } from '../../common/entities/base.entity'
import { Group } from '../group/group.model'
import { Student } from './student.model'

/** Чем оплачено посещение. NULL — легаси-визит, созданный до ввода биллинга. */
export type VisitBilling = 'subscription' | 'payment' | 'none'

@Table({ tableName: 'visits' })
export class Visit extends BaseEntity {
  @ForeignKey(() => Student)
  @Column({ field: 'student_id', type: DataType.UUID, allowNull: false })
  declare studentId: string

  @ForeignKey(() => Group)
  @Column({ field: 'group_id', type: DataType.UUID, allowNull: false })
  declare groupId: string

  @Column({ field: 'training_id', type: DataType.UUID, allowNull: true })
  declare trainingId: string | null

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare date: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare billing: VisitBilling | null

  @Column({ field: 'subscription_id', type: DataType.UUID, allowNull: true })
  declare subscriptionId: string | null

  @Column({ field: 'payment_id', type: DataType.UUID, allowNull: true })
  declare paymentId: string | null
}
```

- [ ] **Step 4: Сборка бэка**

Run: `npm run build -w apps/backend`
Expected: успех без ошибок.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/database/migrations/20260610000001-add-billing-to-visits.js apps/backend/src/modules/student/visit.model.ts
git commit -m "feat(backend): visits.billing/subscription_id/payment_id — визит помнит, чем оплачен"
```

---

### Task 2: Чистая функция `attendancePricing` (TDD)

**Files:**
- Create: `apps/backend/src/modules/training/lib/attendance-pricing.ts`
- Test: `apps/backend/src/modules/training/lib/attendance-pricing.spec.ts`

- [ ] **Step 1: Написать падающий тест (вся матрица из спеки §2)**

```ts
import { attendancePricing } from './attendance-pricing'

const t = (over: Partial<Parameters<typeof attendancePricing>[0]> = {}) => ({
  isPair: false,
  isOnline: false,
  sessionDuration: 60,
  ...over,
})

describe('attendancePricing', () => {
  it('парная 60 → pair/60, single_pair', () => {
    const p = attendancePricing(t({ isPair: true }), false)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual(['pair/60'])
    expect(p.paymentType).toBe('single_pair')
  })

  it('парная 90 → pair/90, single_pair_90', () => {
    const p = attendancePricing(t({ isPair: true, sessionDuration: 90 }), false)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual(['pair/90'])
    expect(p.paymentType).toBe('single_pair_90')
  })

  it('онлайн 60 → online/60 затем individual/60, single_individual', () => {
    const p = attendancePricing(t({ isOnline: true }), true)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual([
      'online/60',
      'individual/60',
    ])
    expect(p.paymentType).toBe('single_individual')
  })

  it('онлайн 90 → online/90 затем individual/90, single_individual_90', () => {
    const p = attendancePricing(t({ isOnline: true, sessionDuration: 90 }), true)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual([
      'online/90',
      'individual/90',
    ])
    expect(p.paymentType).toBe('single_individual_90')
  })

  it('индивидуальная 60 → individual/60, single_individual', () => {
    const p = attendancePricing(t(), true)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual([
      'individual/60',
    ])
    expect(p.paymentType).toBe('single_individual')
  })

  it('индивидуальная 90 → individual/90, single_individual_90', () => {
    const p = attendancePricing(t({ sessionDuration: 90 }), true)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual([
      'individual/90',
    ])
    expect(p.paymentType).toBe('single_individual_90')
  })

  it('групповая 60 → group/60, single_group', () => {
    const p = attendancePricing(t(), false)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual(['group/60'])
    expect(p.paymentType).toBe('single_group')
  })

  it('групповая 90 → исторически individual/90, single_individual_90', () => {
    const p = attendancePricing(t({ sessionDuration: 90 }), false)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual([
      'individual/90',
    ])
    expect(p.paymentType).toBe('single_individual_90')
  })

  it('parность важнее онлайна', () => {
    const p = attendancePricing(t({ isPair: true, isOnline: true }), false)
    expect(p.paymentType).toBe('single_pair')
  })

  it('кривая длительность нормализуется к 60', () => {
    const p = attendancePricing(t({ sessionDuration: 45 }), true)
    expect(p.attempts[0].durationMinutes).toBe(60)
    expect(p.paymentType).toBe('single_individual')
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test -w apps/backend -- attendance-pricing`
Expected: FAIL — `Cannot find module './attendance-pricing'`

- [ ] **Step 3: Реализация**

```ts
import type { ClientPaymentType, LessonKind } from '@trikick/shared'

/** Минимум данных тренировки, влияющих на тариф разового посещения. */
export interface AttendanceTrainingInfo {
  isPair: boolean
  isOnline: boolean
  sessionDuration: number
}

/** Одна попытка поиска тарифа (кортеж без локации). */
export interface PricingAttempt {
  lessonKind: LessonKind
  format: 'single'
  durationMinutes: number
  sessionsCount: 1
}

export interface AttendancePricing {
  /** Упорядоченные попытки поиска тарифа (для онлайна — с фолбэком). */
  attempts: PricingAttempt[]
  paymentType: ClientPaymentType
}

/**
 * Маппит тренировку в кортеж(и) тарифа и тип разового платежа. Зеркало
 * исторической фронтовой логики (`subPaymentType` + `subTypeToTuple`),
 * включая особенность «групповая 90 мин → индивидуальный разовый тариф».
 */
export function attendancePricing(
  training: AttendanceTrainingInfo,
  groupIsIndividual: boolean,
): AttendancePricing {
  const dur = training.sessionDuration === 90 ? 90 : 60
  const single = (lessonKind: LessonKind): PricingAttempt => ({
    lessonKind,
    format: 'single',
    durationMinutes: dur,
    sessionsCount: 1,
  })
  const individualType: ClientPaymentType =
    dur === 90 ? 'single_individual_90' : 'single_individual'

  if (training.isPair) {
    return {
      attempts: [single('pair')],
      paymentType: dur === 90 ? 'single_pair_90' : 'single_pair',
    }
  }
  if (training.isOnline) {
    return { attempts: [single('online'), single('individual')], paymentType: individualType }
  }
  if (groupIsIndividual || dur === 90) {
    return { attempts: [single('individual')], paymentType: individualType }
  }
  return { attempts: [single('group')], paymentType: 'single_group' }
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `npm test -w apps/backend`
Expected: PASS, все прежние тесты тоже зелёные.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/training/lib/attendance-pricing.ts apps/backend/src/modules/training/lib/attendance-pricing.spec.ts
git commit -m "feat(backend): attendancePricing — чистый резолв тарифа разового посещения"
```

---

### Task 3: `SubscriptionsService.restoreById`

**Files:**
- Modify: `apps/backend/src/modules/student/subscriptions.service.ts`

- [ ] **Step 1: Добавить метод после `restore` (логика возврата идентична `restore`)**

```ts
  /** Точечный возврат занятия на конкретный абонемент (откат отметки). */
  async restoreById(subscriptionId: string): Promise<Subscription | null> {
    const sub = await this.subModel.findByPk(subscriptionId)
    if (!sub) return null
    sub.remaining = Math.min(sub.remaining + 1, sub.total)
    if (sub.remaining > 0) sub.isActive = true
    await sub.save()
    return sub
  }
```

- [ ] **Step 2: Сборка**

Run: `npm run build -w apps/backend`
Expected: успех.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/student/subscriptions.service.ts
git commit -m "feat(backend): SubscriptionsService.restoreById — точечный возврат занятия"
```

---

### Task 4: Биллинг в `markAttendance` + модуль + контроллер

**Files:**
- Modify: `apps/backend/src/modules/training/training.module.ts`
- Modify: `apps/backend/src/modules/training/training.service.ts`
- Modify: `apps/backend/src/modules/training/training.controller.ts`

- [ ] **Step 1: Подключить FinanceModule и GroupModule в `training.module.ts`**

```ts
import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { CalendarModule } from '../calendar/calendar.module'
import { FinanceModule } from '../finance/finance.module'
import { GroupModule } from '../group/group.module'
import { LocationModule } from '../location/location.module'
import { StudentModule } from '../student/student.module'
import { TrainingController } from './training.controller'
import { Training } from './training.model'
import { TrainingAttendee } from './training-attendee.model'
import { TrainingService } from './training.service'

@Module({
  imports: [
    SequelizeModule.forFeature([Training, TrainingAttendee]),
    StudentModule,
    GroupModule,
    LocationModule,
    FinanceModule,
    CalendarModule,
  ],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService, SequelizeModule],
})
export class TrainingModule {}
```

(GroupModule и FinanceModule экспортируют свои SequelizeModule/сервисы — проверено.)

- [ ] **Step 2: Дополнить инъекции и импорты `training.service.ts`**

Заменить блок импортов и конструктор:

```ts
import { ConflictException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { FindOptions } from 'sequelize'

import { isPrimeTime } from '@trikick/shared'
import type { DeductStatus } from '@trikick/shared'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { DateUtil } from '../../common/utils/date.util'
import { CalendarSyncService } from '../calendar/services/calendar-sync.service'
import { HallCostsService } from '../finance/hall-costs.service'
import { Payment } from '../finance/payment.model'
import { PaymentsService } from '../finance/payments.service'
import { PricingRule } from '../finance/pricing-rule.model'
import { PricingRulesService } from '../finance/pricing-rules.service'
import { Group } from '../group/group.model'
import { LocationService } from '../location/location.service'
import { Student } from '../student/student.model'
import { SubscriptionsService } from '../student/subscriptions.service'
import { Visit } from '../student/visit.model'
import type { VisitBilling } from '../student/visit.model'
import { CreateTrainingDto } from './dto/create-training.dto'
import { attendancePricing } from './lib/attendance-pricing'
import { seriesUpdateFields, type SeriesUpdateInput } from './lib/series-update'
import { findOverlaps } from './lib/training-overlap'
import { Training } from './training.model'

/** Результат биллинга одного ученика при отметке. */
export interface BillingResult {
  studentId: string
  billing: VisitBilling
  /** Статус абонемента после списания (только при billing='subscription'). */
  subStatus: DeductStatus | null
  remaining: number | null
}

@Injectable()
export class TrainingService extends OwnedCrudService<Training> {
  protected readonly searchField: string | null = null

  constructor(
    @InjectModel(Training) private readonly trainingModel: typeof Training,
    @InjectModel(Visit) private readonly visitModel: typeof Visit,
    @InjectModel(Group) private readonly groupModel: typeof Group,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly locationService: LocationService,
    private readonly calendarSync: CalendarSyncService,
    private readonly pricingRulesService: PricingRulesService,
    private readonly paymentsService: PaymentsService,
    private readonly hallCostsService: HallCostsService,
  ) {
    super(trainingModel)
  }
```

(`DeductStatus` экспортируется из `@trikick/shared` — его уже импортирует `subscriptions.service.ts`.)

- [ ] **Step 3: Переписать `markAttendance` и добавить `createAttendancePayment`**

Заменить текущий `markAttendance` на:

```ts
  /**
   * Отметить посещение. На каждого ученика: уже есть визит → пропуск
   * (идемпотентность); не парное → списание абонемента (включая общий);
   * иначе → авто-платёж по тарифу (+расход зала, кроме онлайна); тарифа
   * нет → визит с billing='none'. Визит записывает результат, откат
   * (`revertVisit`) отменяет ровно его.
   */
  async markAttendance(training: Training, studentIds: string[]): Promise<BillingResult[]> {
    await training.$add('attendees', studentIds)
    const results: BillingResult[] = []
    for (const studentId of studentIds) {
      const existing = await this.visitModel.findOne({
        where: { trainingId: training.id, studentId },
      })
      if (existing) continue

      let billing: VisitBilling = 'none'
      let subscriptionId: string | null = null
      let paymentId: string | null = null
      let subStatus: DeductStatus | null = null
      let remaining: number | null = null

      if (!training.isPair) {
        const { sub, status } = await this.subscriptionsService.deduct(
          studentId,
          training.groupId,
          training.sessionDuration,
        )
        if (sub) {
          billing = 'subscription'
          subscriptionId = sub.id
          subStatus = status
          remaining = sub.remaining
        }
      }

      if (billing === 'none') {
        // Ошибка биллинга не должна ломать отметку: платёж не создан →
        // визит сохраняется с billing='none', UI покажет предупреждение.
        const payment = await this.createAttendancePayment(training, studentId).catch(
          () => null,
        )
        if (payment) {
          billing = 'payment'
          paymentId = payment.id
        }
      }

      await this.visitModel.create({
        studentId,
        groupId: training.groupId,
        trainingId: training.id,
        date: training.date,
        billing,
        subscriptionId,
        paymentId,
      })
      results.push({ studentId, billing, subStatus, remaining })
    }
    await this.calendarSync.enqueueUpsert(training.userId, training.id, training.time)
    return results
  }

  /**
   * Разовый платёж за посещение по тарифу локации (training.locationId или
   * дефолтная локация тренера). Прайм — по сохранённому training.isPrime.
   * Не-онлайн дополнительно пишет расход зала. Нет локации/тарифа → null.
   */
  private async createAttendancePayment(
    training: Training,
    studentId: string,
  ): Promise<Payment | null> {
    const group = await this.groupModel.findByPk(training.groupId)
    const pricing = attendancePricing(
      {
        isPair: training.isPair,
        isOnline: training.isOnline,
        sessionDuration: training.sessionDuration,
      },
      group?.isIndividual ?? false,
    )

    let locationId = training.locationId
    if (!locationId) {
      const locations = await this.locationService.findEveryForUser(training.userId)
      locationId = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? null
    }
    if (!locationId) return null

    let rule: PricingRule | null = null
    for (const a of pricing.attempts) {
      rule = await this.pricingRulesService.findMatch(training.userId, {
        locationId,
        lessonKind: a.lessonKind,
        format: a.format,
        durationMinutes: a.durationMinutes,
        sessionsCount: a.sessionsCount,
      })
      if (rule) break
    }
    if (!rule) return null

    const isPrime = training.isPrime
    let hallCostId: string | null = null
    if (!training.isOnline) {
      const hallCost = await this.hallCostsService.createHallCost(training.userId, {
        studentId,
        locationId,
        hallPaymentType: pricing.paymentType,
        timeSlot: isPrime ? 'prime' : 'regular',
        trainingTime: training.time || '',
        hallAmount: Number(isPrime ? rule.hallPrimeCost : rule.hallCost),
        paidAt: training.date,
      })
      hallCostId = hallCost.id
    }
    return this.paymentsService.createPayment(training.userId, {
      studentId,
      locationId,
      clientPaymentType: pricing.paymentType,
      clientAmount: Number(isPrime ? rule.clientPrimePrice : rule.clientPrice),
      hallCostId,
      paidAt: training.date,
    })
  }
```

Примечание: `hallPaymentType: pricing.paymentType` корректен — `HallPaymentType` включает те же разовые значения (`single_individual`, `single_group`, `single_individual_90`, `single_pair`, `single_pair_90`), валидатор `CreateHallCostDto.HALL_TYPES` их содержит.

- [ ] **Step 4: Сидер пишет `billing='none'`**

В `attachAttendeesWithVisits` заменить `visitModel.create({...})` на:

```ts
      await this.visitModel.create({
        studentId,
        groupId: training.groupId,
        trainingId: training.id,
        date: training.date,
        billing: 'none',
        subscriptionId: null,
        paymentId: null,
      })
```

- [ ] **Step 5: Контроллер — ответ `{ training, billing }`**

В `training.controller.ts` заменить метод `addAttendees`:

```ts
  @Post(':id/attendees')
  @ApiOperation({ summary: 'Добавить учеников на тренировку (списание/авто-платёж на бэке)' })
  async addAttendees(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: AttendeesDto,
  ): Promise<{ training: Training; billing: BillingResult[] }> {
    const training = await this.trainingService.findOneForUser(user.id, id)
    const billing = await this.trainingService.markAttendance(training, dto.studentIds)
    return { training: await this.trainingService.findOneForUser(user.id, id), billing }
  }
```

Добавить в импорты контроллера: `import { TrainingService, type BillingResult } from './training.service'` (заменив существующий импорт `TrainingService`).

`createTraining` в сервисе вызывает `markAttendance` и игнорирует результат — менять не надо.

- [ ] **Step 6: Сборка + тесты**

Run: `npm run build -w apps/backend && npm test -w apps/backend`
Expected: успех, все тесты зелёные.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/training
git commit -m "feat(backend): биллинг при отметке — списание или авто-платёж, ответ { training, billing }"
```

---

### Task 5: Точный откат `revertVisit`

**Files:**
- Modify: `apps/backend/src/modules/training/training.service.ts` (`removeAttendee`, `removeTraining`, `removeSeries`)

- [ ] **Step 1: Добавить `revertVisit` и переписать `removeAttendee`**

Заменить текущий `removeAttendee` на:

```ts
  /**
   * Откат визита строго по записанному billing: 'subscription' → +1 на тот
   * самый абонемент; 'payment' → удалить платёж (каскадом расход зала);
   * 'none' → ничего; NULL (легаси) → старая эвристика restore. Визит
   * удаляется в конце.
   */
  private async revertVisit(training: Training, studentId: string): Promise<void> {
    const visit = await this.visitModel.findOne({
      where: { trainingId: training.id, studentId },
    })
    if (!visit) return
    if (visit.billing === 'subscription' && visit.subscriptionId) {
      await this.subscriptionsService.restoreById(visit.subscriptionId)
    } else if (visit.billing === 'payment' && visit.paymentId) {
      // Платёж могли удалить вручную в Финансах — тогда молча пропускаем.
      await this.paymentsService
        .removePayment(training.userId, visit.paymentId)
        .catch(() => undefined)
    } else if (visit.billing == null) {
      await this.subscriptionsService.restore(studentId, training.groupId, training.sessionDuration)
    }
    await visit.destroy()
  }

  /** Remove a student from a training: revert billing + delete visit. */
  async removeAttendee(training: Training, studentId: string): Promise<void> {
    await training.$remove('attendees', studentId)
    await this.revertVisit(training, studentId)
    await this.calendarSync.enqueueUpsert(training.userId, training.id, training.time)
  }
```

- [ ] **Step 2: Переписать `removeTraining` через `revertVisit`**

```ts
  /** Delete a training: revert billing and remove visits for every attendee. */
  async removeTraining(userId: string, id: string): Promise<void> {
    const training = await this.findOneForUser(userId, id)
    const attendeeIds = (training.attendees ?? []).map((s) => s.id)
    for (const studentId of attendeeIds) {
      await this.revertVisit(training, studentId)
    }
    await this.calendarSync.enqueueDelete(userId, training.id)
    await training.destroy()
  }
```

- [ ] **Step 3: Переписать `removeSeries` через `revertVisit`**

```ts
  /** Delete a recurring series by recurringId, reverting billing for all attendees. */
  async removeSeries(userId: string, recurringId: string): Promise<number> {
    const trainings = await this.trainingModel.findAll({
      where: { userId, recurringId },
      include: [Student],
    })
    for (const t of trainings) {
      const attendeeIds = (t.attendees ?? []).map((s) => s.id)
      for (const studentId of attendeeIds) {
        await this.revertVisit(t, studentId)
      }
      await this.calendarSync.enqueueDelete(userId, t.id)
      await t.destroy()
    }
    return trainings.length
  }
```

- [ ] **Step 4: Сборка + тесты**

Run: `npm run build -w apps/backend && npm test -w apps/backend`
Expected: успех.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/training/training.service.ts
git commit -m "feat(backend): revertVisit — откат отметки строго по записанному биллингу"
```

---

### Task 6: Фронт — репозиторий и тонкий `markAttendance`

**Files:**
- Modify: `apps/frontend/src/entities/trainings/model/trainings.repo.ts`
- Modify: `apps/frontend/src/entities/trainings/model/training-logic.ts`
- Modify: `apps/frontend/src/entities/trainings/api/use-trainings.ts`

- [ ] **Step 1: `trainings.repo.ts` — новый ответ `addAttendees`**

Заменить функцию `addAttendees` (и добавить тип перед ней):

```ts
/** Результат биллинга одного ученика при отметке (зеркало бэка). */
export interface BillingResult {
  studentId: string
  billing: 'subscription' | 'payment' | 'none'
  subStatus: 'ok' | 'ending' | 'expired' | 'none' | null
  remaining: number | null
}

/**
 * Add students to a training. The backend deducts a session per student OR
 * records an auto-payment, records visits, and reports billing per student.
 */
export async function addAttendees(
  trainingId: string,
  studentIds: string[],
): Promise<{ training: Training | null; billing: BillingResult[] }> {
  if (!studentIds.length) {
    return { training: await getTrainingById(trainingId), billing: [] }
  }
  const { byId } = await getGroupMaps()
  const raw = await apiClient.post<{ training: RawTraining; billing: BillingResult[] }>(
    `/trainings/${trainingId}/attendees`,
    { studentIds },
  )
  return { training: toTraining(raw.training, byId), billing: raw.billing ?? [] }
}
```

- [ ] **Step 2: `training-logic.ts` — `markAttendance` тонкая обёртка, удалить `markAttendanceWithPayment`**

Удалить целиком: функцию `markAttendanceWithPayment`, старое тело `markAttendance`, интерфейс `MarkResult` (заменяется), импорты `getStudentById`, `autoCreatePayment`, `isIndividualTraining` (если больше не используются в файле), `DeductStatus`/`Subscription` из types (проверить).

Вставить вместо них:

```ts
import { addAttendees } from './trainings.repo'
import { getStudents } from 'entities/students/model/students.repo'

import type { BillingResult } from './trainings.repo'
import type { DeductStatus } from 'entities/students/model/types'

export interface MarkResult {
  studentId: string
  name: string
  billing: BillingResult['billing']
  /** Статус абонемента после списания; 'none' — списания не было. */
  status: DeductStatus
  remaining: number | null
}

/**
 * Отметить посещение. Биллинг (списание абонемента ИЛИ авто-платёж по тарифу)
 * целиком на бэке; здесь только маппинг ответа в результаты для тостов.
 */
export async function markAttendance(
  training: Training,
  studentIds: string[],
): Promise<MarkResult[]> {
  if (!studentIds.length) return []
  const { billing } = await addAttendees(training.id, studentIds)
  const students = await getStudents()
  const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? ''
  return billing.map((b) => ({
    studentId: b.studentId,
    name: nameOf(b.studentId),
    billing: b.billing,
    status: b.billing === 'subscription' ? ((b.subStatus ?? 'ok') as DeductStatus) : 'none',
    remaining: b.remaining,
  }))
}
```

Проверить, что `checkTrainingConflict`, `isPrimeTime`-реэкспорт и `formatSchedule` в файле не задеты; убрать ставшие лишними импорты (`filter`/`map` из lodash остаются — используются в `checkTrainingConflict`/`formatSchedule`).

- [ ] **Step 3: `use-trainings.ts` — без изменений логики**

`useMarkAttendance` уже зовёт `markAttendance` — сигнатура совместима (возвращает `MarkResult[]`). Убедиться, что компилится.

- [ ] **Step 4: Сборка фронта**

Run: `npm run build -w apps/frontend`
Expected: ошибки только в местах-потребителях `markAttendanceWithPayment`/`r.sub` (это следующая задача) — если они есть, перейти к Task 7 и собрать после неё. Если сборка зелёная — отлично.

- [ ] **Step 5: Commit (вместе с Task 7, если сборка требует обоих)**

```bash
git add apps/frontend/src/entities/trainings/model/trainings.repo.ts apps/frontend/src/entities/trainings/model/training-logic.ts
git commit -m "feat(frontend): markAttendance — тонкая обёртка над бэкенд-биллингом"
```

---

### Task 7: Фронт — все точки отметки на новый контракт

**Files:**
- Modify: `apps/frontend/src/pages/home/use-mark-today.ts`
- Modify: `apps/frontend/src/entities/trainings/form/use-calendar-training.ts`
- Modify: `apps/frontend/src/entities/trainings/form/use-add-to-training.ts`
- Modify: `apps/frontend/src/entities/trainings/form/use-group-training.ts`
- Modify: `apps/frontend/src/entities/trainings/api/use-training-actions.ts`
- Modify (возможно): `apps/frontend/src/entities/students/model/students.repo.ts`

- [ ] **Step 1: `use-mark-today.ts` — на `markAttendance` + предупреждение «нет тарифа»**

Импорт: заменить `markAttendanceWithPayment` на `markAttendance` (из `entities/trainings`; проверить, что индекс-экспорт `entities/trainings/index.ts` экспортирует `markAttendance`, при необходимости добавить).

В `save()` собрать результаты и показать предупреждение:

```ts
  const save = async () => {
    setSaving(true)
    try {
      const noTariff: string[] = []
      for (const tg of todayGroups) {
        const checked = [...(checks[tg.groupId] ?? [])]
        const toAdd = checked.filter((id) => !tg.originalAttendees.has(id))
        const toRemove = [...tg.originalAttendees].filter((id) => !checked.includes(id))

        let training = tg.existing
        if (!training && checked.length > 0) {
          training = await createTraining({
            groupId: tg.groupId,
            date: todayStr,
            time: tg.time,
            attendees: [],
            sessionDuration: tg.duration,
          })
        }
        if (!training) continue

        if (toAdd.length) {
          const results = await markAttendance(training, toAdd)
          noTariff.push(...results.filter((r) => r.billing === 'none').map((r) => r.name))
        }

        for (const sid of toRemove) {
          await removeAttendee(training.id, sid)
        }
      }

      for (const ti of todayIndividuals) {
        const isChecked = indChecks[ti.trainingId] ?? ti.originalPresent
        if (!isChecked && ti.originalPresent) {
          await removeAttendee(ti.trainingId, ti.studentId)
        } else if (isChecked && !ti.originalPresent) {
          const tr = trainings.find((t) => t.id === ti.trainingId)
          if (tr) {
            const results = await markAttendance(tr, [ti.studentId])
            noTariff.push(...results.filter((r) => r.billing === 'none').map((r) => r.name))
          }
        }
      }

      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: groupKeys.all })
      if (noTariff.length) {
        toast({ type: 'warn', title: t('finance.autoRecord.noTariff'), msg: noTariff.join(', ') })
      }
      toast({ type: 'success', title: t('home.attendanceSaved') })
      onClose()
    } finally {
      setSaving(false)
    }
  }
```

- [ ] **Step 2: `use-calendar-training.ts` — эндпоинты вместо ручного отката**

Импорты: удалить `removeVisit, restoreSession` из `entities/students/model/students.repo`; удалить `updateTraining` из импорта repo, добавить `removeAttendee as removeAttendeeApi` из `'../model/trainings.repo'`.

Заменить `removeAttendee` (точечное удаление ученика):

```ts
  const removeAttendee = async (studentId: string) => {
    if (!training) return
    try {
      await removeAttendeeApi(training.id, studentId)
      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: ['trainings', 'all'] })
      toast({ type: 'info', title: t('trainings.cal.studentRemoved') })
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }
```

Заменить `saveAttendance` (убрать перезапись attendees и ручной откат; добавить предупреждение «нет тарифа»):

```ts
  const saveAttendance = async () => {
    setSaving(true)
    try {
      let current = training
      if (!current && checked.size > 0) {
        current = await createTraining({
          groupId: block.groupId,
          date: block.date,
          time: block.time || '',
          attendees: [],
          note: '',
        })
      }
      if (!current) {
        onDone()
        return
      }

      const toAdd = [...checked].filter((id) => !attendeeSet.has(id))
      if (toAdd.length) {
        const results = await markAttendance(current, toAdd)
        const noTariff = results.filter((r) => r.billing === 'none').map((r) => r.name)
        if (noTariff.length) {
          toast({
            type: 'warn',
            title: t('finance.autoRecord.noTariff'),
            msg: noTariff.join(', '),
          })
        }
      }

      const toRemove = groupRows
        .map((r) => r.studentId)
        .filter((id) => !checked.has(id) && attendeeSet.has(id))
      for (const sid of toRemove) {
        await removeAttendeeApi(current.id, sid)
      }

      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: ['trainings', 'all'] })
      toast({ type: 'success', title: t('trainings.cal.attendanceSaved') })
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }
```

Также удалить ставший неиспользуемым импорт `getTrainingById` (если он больше нигде в файле не нужен).

- [ ] **Step 3: `use-add-to-training.ts` — новый `MarkResult`, без перезаписи attendees**

В ветке `tab === 'group'`: удалить строки `const attendees = [...]` и `await updateTraining.mutateAsync(...)` (PATCH attendees — no-op, состав ведут эндпоинты). Удалить `useUpdateTraining` из импортов и `const updateTraining = ...`, если больше не используется.

Обновить цикл тостов (оба места — для `tab==='group'` и для нового ученика):

```ts
        for (const r of results) {
          if (r.status === 'expired') {
            toast({ type: 'error', title: r.name, msg: t('trainings.addTo.subExpired') })
          } else if (r.status === 'ending') {
            toast({
              type: 'warn',
              title: r.name,
              msg: t('trainings.addTo.remaining', { count: r.remaining ?? 0 }),
            })
          } else if (r.billing === 'none') {
            toast({ type: 'warn', title: r.name, msg: t('finance.autoRecord.noTariff') })
          }
        }
```

(Старый тост `noActiveSub` уходит: теперь «нет абонемента» = создан разовый платёж, это штатно и не требует предупреждения.)

Во второй ветке (новый ученик) цикл `if (newSubType) { for ... }` заменить тем же блоком без условия `newSubType`.

- [ ] **Step 4: `use-group-training.ts` — тот же цикл тостов**

Заменить цикл `for (const r of results)` тем же блоком, что в Step 3 (с `r.remaining ?? 0` и `r.billing === 'none'` → `finance.autoRecord.noTariff`).

- [ ] **Step 5: `use-training-actions.ts` — убрать ручной откат**

Полное новое содержимое файла:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { studentKeys } from 'entities/students/api/use-students'
import {
  deleteRecurringSeries,
  deleteTraining,
  removeAttendee,
} from 'entities/trainings/model/trainings.repo'

import { trainingKeys } from './use-trainings'

import type { Training } from 'entities/trainings/model/types'

/** Remove a single student from a training; the backend reverts billing. */
export function useRemoveFromTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ trainingId, studentId }: { trainingId: string; studentId: string }) => {
      await removeAttendee(trainingId, studentId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
    },
  })
}

/** Delete a training (or its whole recurring series); the backend reverts billing. */
export function useDeleteTrainingWithRestore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ training, series }: { training: Training; series: boolean }) => {
      if (series && training.recurringId) {
        await deleteRecurringSeries(training.recurringId)
      } else {
        await deleteTraining(training.id)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
    },
  })
}
```

- [ ] **Step 6: Зачистка `restoreSession`/`removeVisit`**

Run: `grep -rn "restoreSession\|removeVisit\b" apps/frontend/src --include="*.ts*" | grep -v students.repo`
Expected: использований не осталось. Тогда удалить обе функции (`restoreSession`, `removeVisit`) из `apps/frontend/src/entities/students/model/students.repo.ts`. Если использования остались — оставить функции, зафиксировать где.

- [ ] **Step 7: Сборка фронта**

Run: `npm run build -w apps/frontend`
Expected: успех (tsc + vite).

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src
git commit -m "feat(frontend): все точки отметки на бэкенд-биллинг, точный откат, тост «нет тарифа»"
```

---

### Task 8: Полный gate и ручная проверка

- [ ] **Step 1: Полный gate**

Run: `npm run build -w apps/backend && npm test -w apps/backend && npm run build -w apps/frontend`
Expected: всё зелёное.

- [ ] **Step 2: Поднять окружение**

Run: `npm run start:dev -w apps/backend` (порт 3021) и `npm run dev` (порт 3020). Вход: `demo@trikick.ru` / `demo1234`.

- [ ] **Step 3: Ручной чек-лист (спека §6)**

| # | Сценарий | Ожидание |
|---|---|---|
| 1 | Отметка с активным абонементом (любая точка UI) | списание −1, платежа нет |
| 2 | Снятие отметки сценария 1 | +1 на тот же абонемент |
| 3 | Отметка без абонемента, тариф есть (из календаря!) | платёж + расход зала |
| 4 | Снятие отметки сценария 3 | платёж и расход зала удалены |
| 5 | Повторная отметка того же ученика | дублей платежа/визита нет |
| 6 | Парное занятие: отметка обоих из календаря | 2 × `single_pair` платежа, абонементы не тронуты |
| 7 | Снятие одного из пары | его платёж удалён, абонемент не вырос |
| 8 | Отметка без абонемента и без тарифа | визит есть, тост «Нет тарифа», на снятии ничего не возвращается |
| 9 | Общий абонемент, покрывающий группу | списание с общего, разовый платёж НЕ создан |
| 10 | Онлайн-занятие без абонемента | платёж без расхода зала |

После проверки откатить созданные тестовые данные (удалить тестовые занятия/платежи).

- [ ] **Step 4: Финал — superpowers:finishing-a-development-branch**

Мерж в `main` + push (как предыдущие фичи), обновить `docs/ARCHITECTURE.md` §7 (история фич) и память.

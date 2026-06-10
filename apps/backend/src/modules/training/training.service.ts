import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/sequelize'
import { UniqueConstraintError } from 'sequelize'
import type { FindOptions, Transaction } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'

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
import {
  seriesForbiddenFields,
  seriesUpdateFields,
  type SeriesUpdateInput,
} from './lib/series-update'
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
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {
    super(trainingModel)
  }

  protected get include(): FindOptions['include'] {
    return [Student]
  }

  /**
   * Create a training. When `deductSessions` is true (default) attendees'
   * sessions are deducted and visits recorded; the seeder passes false to
   * create historical records without re-deducting.
   *
   * Если `dto.isPrime` не передан, признак прайм-тайма выводится из времени
   * с учётом кастомного окна локации (если она указана). Логика общая с
   * фронтом — функция `isPrimeTime` из `@trikick/shared`.
   */
  async createTraining(
    userId: string,
    dto: CreateTrainingDto,
    deductSessions = true,
  ): Promise<Training> {
    // Серверный барьер от наслоения: занятие с временем не должно пересекаться
    // по времени с другим занятием тренера в тот же день. Сидер (deductSessions
    // = false) создаёт исторические записи и проверку пропускает.
    if (deductSessions && dto.time) {
      const sameDay = await this.trainingModel.findAll({
        where: { userId, date: dto.date },
      })
      const overlaps = findOverlaps(
        { date: dto.date, time: dto.time, durationMinutes: dto.sessionDuration ?? 60 },
        sameDay.map((t) => ({
          id: t.id,
          date: t.date,
          time: t.time,
          sessionDuration: t.sessionDuration,
        })),
      )
      if (overlaps.length) {
        throw new ConflictException('Время занятия пересекается с другим занятием')
      }
    }

    let isPrime = dto.isPrime
    if (isPrime === undefined) {
      const location = dto.locationId
        ? await this.locationService.findOneForUser(userId, dto.locationId).catch(() => null)
        : null
      isPrime = isPrimeTime(dto.date, dto.time ?? '', location)
    }

    const training = await this.createForUser(userId, {
      groupId: dto.groupId,
      locationId: dto.locationId ?? null,
      date: dto.date,
      time: dto.time ?? '',
      note: dto.note ?? '',
      isPrime,
      sessionDuration: dto.sessionDuration ?? 60,
      recurring: dto.recurring ?? false,
      recurringId: dto.recurringId ?? null,
      isOnline: dto.isOnline ?? false,
      plannedStudentId: dto.plannedStudentId ?? null,
      isPair: dto.isPair ?? false,
      plannedStudentId2: dto.plannedStudentId2 ?? null,
    })

    if (dto.attendees?.length) {
      if (deductSessions) {
        await this.markAttendance(training, dto.attendees)
      } else {
        await this.attachAttendeesWithVisits(training, dto.attendees)
      }
    }
    await this.calendarSync.enqueueUpsert(userId, training.id, training.time)
    return this.findOneForUser(userId, training.id)
  }

  /** Обновление + постановка синхронизации события. */
  async updateForUser(userId: string, id: string, data: object): Promise<Training> {
    const training = await super.updateForUser(userId, id, data)
    await this.calendarSync.enqueueUpsert(userId, training.id, training.time)
    return training
  }

  /**
   * Обновить все занятия повторяющейся серии. Распространяемые поля (время/локация/
   * заметка/онлайн) применяются ко всем; `groupId`/`date` отклоняются с 400 (дата
   * у каждого своя, смена группы меняет биллинг). Прайм пересчитывается по дате
   * каждого занятия. На каждое занятие ставится upsert.
   */
  async updateSeriesForUser(
    userId: string,
    recurringId: string,
    dto: SeriesUpdateInput,
  ): Promise<number> {
    const forbidden = seriesForbiddenFields(dto)
    if (forbidden.length) {
      throw new BadRequestException(
        `Для серии не редактируются поля: ${forbidden.join(', ')} — измените занятие отдельно`,
      )
    }
    const fields = seriesUpdateFields(dto)
    const trainings = await this.trainingModel.findAll({ where: { userId, recurringId } })
    // Смена времени применяется ко всей серии — проверяем, что ни одно занятие
    // серии не наслаивается на занятие вне серии в свою дату. Сначала проверяем
    // все, и только потом сохраняем (не оставляем серию частично сдвинутой).
    if (fields.time !== undefined) {
      const seriesIds = trainings.map((t) => t.id)
      for (const t of trainings) {
        const sameDay = await this.trainingModel.findAll({
          where: { userId, date: t.date },
        })
        const overlaps = findOverlaps(
          { date: t.date, time: fields.time, durationMinutes: t.sessionDuration },
          sameDay.map((x) => ({
            id: x.id,
            date: x.date,
            time: x.time,
            sessionDuration: x.sessionDuration,
          })),
          seriesIds,
        )
        if (overlaps.length) {
          throw new ConflictException(`Серия пересекается с другим занятием (${t.date})`)
        }
      }
    }
    for (const t of trainings) {
      if (fields.time !== undefined) t.time = fields.time
      if (fields.locationId !== undefined) t.locationId = fields.locationId
      if (fields.note !== undefined) t.note = fields.note
      if (fields.isOnline !== undefined) t.isOnline = fields.isOnline
      const location = t.locationId
        ? await this.locationService.findOneForUser(userId, t.locationId).catch(() => null)
        : null
      t.isPrime = isPrimeTime(t.date, t.time, location)
      await t.save()
      await this.calendarSync.enqueueUpsert(userId, t.id, t.time)
    }
    return trainings.length
  }

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

      // Списание/платёж и визит — одна транзакция: сбой между ними не оставит
      // «деньги без визита» (повторная отметка списала бы второй раз). Гонку
      // параллельных отметок закрывает UNIQUE(training_id, student_id) на
      // visits: проигравшая транзакция откатывается целиком вместе с деньгами.
      try {
        const result = await this.sequelize.transaction(async (tx) => {
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
              tx,
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
            const payment = await this.createAttendancePayment(training, studentId, tx).catch(
              () => null,
            )
            if (payment) {
              billing = 'payment'
              paymentId = payment.id
            }
          }

          await this.visitModel.create(
            {
              studentId,
              groupId: training.groupId,
              trainingId: training.id,
              date: training.date,
              billing,
              subscriptionId,
              paymentId,
            },
            { transaction: tx },
          )
          return { studentId, billing, subStatus, remaining }
        })
        results.push(result)
      } catch (e) {
        // Параллельный запрос успел записать визит первым — наша транзакция
        // откатилась вместе со списанием/платежом, ученик уже отмечен.
        if (e instanceof UniqueConstraintError) continue
        throw e
      }
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
    tx: Transaction | null = null,
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
      const hallCost = await this.hallCostsService.createHallCost(
        training.userId,
        {
          studentId,
          locationId,
          hallPaymentType: pricing.paymentType,
          timeSlot: isPrime ? 'prime' : 'regular',
          trainingTime: training.time || '',
          hallAmount: Number(isPrime ? rule.hallPrimeCost : rule.hallCost),
          paidAt: training.date,
        },
        tx,
      )
      hallCostId = hallCost.id
    }
    return this.paymentsService.createPayment(
      training.userId,
      {
        studentId,
        locationId,
        clientPaymentType: pricing.paymentType,
        clientAmount: Number(isPrime ? rule.clientPrimePrice : rule.clientPrice),
        hallCostId,
        paidAt: training.date,
      },
      tx,
    )
  }

  /** Attach attendees and record visits WITHOUT deducting sessions (seeder). */
  async attachAttendeesWithVisits(training: Training, studentIds: string[]): Promise<void> {
    await training.$add('attendees', studentIds)
    for (const studentId of studentIds) {
      // billing='none': демо-история не порождает фантомных возвратов/платежей.
      await this.visitModel.create({
        studentId,
        groupId: training.groupId,
        trainingId: training.id,
        date: training.date,
        billing: 'none',
        subscriptionId: null,
        paymentId: null,
      })
    }
  }

  /**
   * Откат визита строго по записанному billing: 'subscription' → +1 на тот
   * самый абонемент; 'payment' → удалить платёж (каскадом расход зала);
   * 'none' → ничего; NULL (легаси) → старая эвристика restore. Визит
   * удаляется в конце.
   */
  private async revertVisit(training: Training, studentId: string): Promise<void> {
    // Весь откат — одна транзакция, визит читается с блокировкой (FOR UPDATE):
    // параллельное снятие ждёт коммита первого, затем видит визит удалённым и
    // выходит — возврат занятия/платежа не задваивается. Атомарность возврата
    // и удаления визита также закрывает сбой между ними.
    await this.sequelize.transaction(async (tx) => {
      const visit = await this.visitModel.findOne({
        where: { trainingId: training.id, studentId },
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      })
      if (!visit) return
      if (visit.billing === 'subscription' && visit.subscriptionId) {
        await this.subscriptionsService.restoreById(visit.subscriptionId as string, tx)
      } else if (visit.billing === 'payment' && visit.paymentId) {
        // Платёж могли удалить вручную в Финансах — тогда молча пропускаем.
        await this.paymentsService
          .removePayment(training.userId, visit.paymentId)
          .catch(() => undefined)
      } else if (visit.billing == null) {
        await this.subscriptionsService.restore(
          studentId,
          training.groupId,
          training.sessionDuration,
        )
      }
      await visit.destroy({ transaction: tx })
    })
  }

  /** Remove a student from a training: revert billing + delete visit. */
  async removeAttendee(training: Training, studentId: string): Promise<void> {
    await training.$remove('attendees', studentId)
    await this.revertVisit(training, studentId)
    await this.calendarSync.enqueueUpsert(training.userId, training.id, training.time)
  }

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

  /** Trainings within a date range. */
  async findInRange(userId: string, from?: string, to?: string): Promise<Training[]> {
    const trainings = await this.findEveryForUser(userId)
    if (!from && !to) return trainings
    return trainings.filter((t) => {
      if (from && t.date < from) return false
      if (to && t.date > to) return false
      return true
    })
  }

  /** Today as ISO — convenience used by callers. */
  static today(): string {
    return DateUtil.todayIso()
  }
}

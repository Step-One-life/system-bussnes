import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/sequelize'
import { UniqueConstraintError } from 'sequelize'
import type { FindOptions, Transaction } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'

import { isPrimeTime } from '@trikick/shared'
import type { DeductStatus } from '@trikick/shared'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { DateUtil } from '../../common/utils/date.util'
import { ActivityLogService } from '../activity-log/activity-log.service'
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
  seriesTargets,
  seriesUpdateFields,
  type SeriesUpdateInput,
} from './lib/series-update'
import { findOverlaps, scheduleSlotsForDate, type ExistingTraining } from './lib/training-overlap'
import { Training } from './training.model'

/** Результат биллинга одного ученика при отметке. */
export interface BillingResult {
  studentId: string
  billing: VisitBilling
  /** Статус абонемента после списания (только при billing='subscription'). */
  subStatus: DeductStatus | null
  remaining: number | null
  /** Сумма авто-платежа при billing='payment' (иначе null). */
  amount: number | null
  /** id созданного авто-платежа (для журнала/отката). */
  paymentId: string | null
}

@Injectable()
export class TrainingService extends OwnedCrudService<Training> {
  protected readonly searchField: string | null = null

  constructor(
    @InjectModel(Training) private readonly trainingModel: typeof Training,
    @InjectModel(Visit) private readonly visitModel: typeof Visit,
    @InjectModel(Group) private readonly groupModel: typeof Group,
    @InjectModel(Student) private readonly studentModel: typeof Student,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly locationService: LocationService,
    private readonly calendarSync: CalendarSyncService,
    private readonly pricingRulesService: PricingRulesService,
    private readonly paymentsService: PaymentsService,
    private readonly hallCostsService: HallCostsService,
    private readonly activityLog: ActivityLogService,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {
    super(trainingModel)
  }

  protected get include(): FindOptions['include'] {
    return [Student]
  }

  /**
   * Проверяет, что все переданные ученики принадлежат тренеру. null/undefined
   * отсеиваются (плановый второй ученик может отсутствовать). Бросает 404 на
   * первый чужой/несуществующий id (не раскрываем существование чужих строк).
   */
  private async assertStudentsOwned(
    userId: string,
    ids: Array<string | null | undefined>,
  ): Promise<void> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))]
    if (!unique.length) return
    const found = await this.studentModel.findAll({
      where: { id: unique, userId },
      attributes: ['id'],
    })
    if (found.length !== unique.length) {
      throw new NotFoundException('Ученик не найден')
    }
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
    // Владение обязательно: группа, локация и все ученики (плановые + отмечаемые)
    // должны принадлежать тренеру, иначе чужой абонемент/локация попали бы в
    // занятие (IDOR с финансовыми последствиями при отметке).
    const group = await this.groupModel.findOne({ where: { id: dto.groupId, userId } })
    if (!group) throw new NotFoundException('Группа не найдена')
    await this.assertStudentsOwned(userId, [
      dto.plannedStudentId,
      dto.plannedStudentId2,
      ...(dto.attendees ?? []),
    ])

    // Серверный барьер от наслоения: занятие с временем не должно пересекаться
    // по времени с другим занятием тренера в тот же день (включая ещё не
    // записанные слоты расписаний групп). Сидер (deductSessions = false)
    // создаёт исторические записи и проверку пропускает.
    if (deductSessions && dto.time) {
      const candidates = await this.overlapCandidatesFor(userId, dto.date, dto.groupId)
      const overlaps = findOverlaps(
        { date: dto.date, time: dto.time, durationMinutes: dto.sessionDuration ?? 60 },
        candidates,
      )
      if (overlaps.length) {
        throw new ConflictException('Время занятия пересекается с другим занятием')
      }
    }

    // Локация (если указана) обязана принадлежать тренеру — findOneForUser
    // бросит 404 на чужую/несуществующую (раньше .catch глотал и сбрасывал прайм).
    const location = dto.locationId
      ? await this.locationService.findOneForUser(userId, dto.locationId)
      : null
    let isPrime = dto.isPrime
    if (isPrime === undefined) {
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

  /**
   * Кандидаты наложения на дату: реальные занятия дня + слоты расписаний
   * групп («Запланировано» в календаре). Слот подавляется записанной
   * тренировкой своей группы; `excludeGroupId` исключает слот группы самого
   * кандидата (см. scheduleSlotsForDate).
   */
  private async overlapCandidatesFor(
    userId: string,
    date: string,
    excludeGroupId?: string | null,
  ): Promise<ExistingTraining[]> {
    const [sameDay, groups] = await Promise.all([
      this.trainingModel.findAll({ where: { userId, date } }),
      this.groupModel.findAll({ where: { userId } }),
    ])
    const real = sameDay.map((t) => ({
      id: t.id,
      date: t.date,
      time: t.time,
      sessionDuration: t.sessionDuration,
    }))
    const slots = scheduleSlotsForDate(
      date,
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        duration: g.duration,
        isIndividual: g.isIndividual,
        schedule: g.schedule ?? [],
      })),
      sameDay.map((t) => t.groupId),
      excludeGroupId,
    )
    return [...real, ...slots]
  }

  /**
   * Обновление + постановка синхронизации события. Смена даты/времени
   * проходит тот же барьер наложений, что и создание (исключая само занятие);
   * правки без смены даты/времени не блокируются давними наложениями.
   */
  async updateForUser(userId: string, id: string, data: object): Promise<Training> {
    const changes = data as { date?: string; time?: string }
    const current = await this.findOneForUser(userId, id)
    const date = changes.date ?? current.date
    const time = changes.time ?? current.time
    if (time && (date !== current.date || time !== current.time)) {
      const candidates = await this.overlapCandidatesFor(userId, date, current.groupId)
      const overlaps = findOverlaps(
        { date, time, durationMinutes: current.sessionDuration || 60 },
        candidates,
        [id],
      )
      if (overlaps.length) {
        throw new ConflictException('Время занятия пересекается с другим занятием')
      }
    }
    const training = await super.updateForUser(userId, id, data)
    await this.calendarSync.enqueueUpsert(userId, training.id, training.time)
    return training
  }

  /**
   * Обновить все занятия повторяющейся серии. Распространяемые поля (время/локация/
   * заметка/онлайн) применяются ко всем; перенос на другой день задаётся
   * относительным `dateShiftDays` (сдвигает дату КАЖДОГО занятия — серия целиком
   * едет на другой день недели). Абсолютные `date`/`groupId` отклоняются с 400.
   * Прайм пересчитывается по новой дате каждого занятия. На каждое занятие ставится upsert.
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
    const shiftDays = dto.dateShiftDays ?? 0
    const trainings = await this.trainingModel.findAll({ where: { userId, recurringId } })
    const seriesIds = trainings.map((t) => t.id)
    const targets = seriesTargets(trainings, fields.time, shiftDays)
    // Перенос/смена времени применяются ко всей серии — проверяем, что ни одно
    // сдвигаемое занятие не наслаивается на занятие вне серии в свою НОВУЮ дату.
    // Проверяются только реально сдвигаемые занятия (moved): сейв без сдвига не
    // блокируется давним (до-барьерным) наложением. Сначала проверяем все,
    // и только потом сохраняем (не оставляем серию частично перенесённой).
    for (const { occ, date, time, moved } of targets) {
      if (!moved || !time) continue
      const candidates = await this.overlapCandidatesFor(userId, date, occ.groupId)
      const overlaps = findOverlaps(
        { date, time, durationMinutes: occ.sessionDuration },
        candidates,
        seriesIds,
      )
      if (overlaps.length) {
        throw new ConflictException(`Серия пересекается с другим занятием (${date})`)
      }
    }
    for (const { occ, date, time } of targets) {
      if (shiftDays) occ.date = date
      if (fields.time !== undefined) occ.time = time
      if (fields.locationId !== undefined) occ.locationId = fields.locationId
      if (fields.note !== undefined) occ.note = fields.note
      if (fields.isOnline !== undefined) occ.isOnline = fields.isOnline
      const location = occ.locationId
        ? await this.locationService.findOneForUser(userId, occ.locationId).catch(() => null)
        : null
      occ.isPrime = isPrimeTime(occ.date, occ.time, location)
      await occ.save()
      await this.calendarSync.enqueueUpsert(userId, occ.id, occ.time)
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
    // Отмечать можно только своих учеников: иначе deduct/$add списали бы занятие
    // с чужого абонемента или повесили чужому ученику авто-платёж (IDOR).
    await this.assertStudentsOwned(training.userId, studentIds)
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
          let amount: number | null = null

          {
            // Парная тренировка списывает только ПАРНЫЙ абонемент (wantPair),
            // обычная — индивидуальный/групповой. Нет подходящего → авто-платёж ниже.
            const { sub, status } = await this.subscriptionsService.deduct(
              studentId,
              training.groupId,
              training.sessionDuration,
              tx,
              training.isPair,
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
              amount = Number(payment.clientAmount)
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
          return { studentId, billing, subStatus, remaining, amount, paymentId }
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
    await this.activityLog.markAttendanceUndone(training.id, studentId)
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
    await this.activityLog.markTrainingCreatedUndone(training.id)
    await training.destroy()
  }

  /**
   * Delete a recurring series by recurringId, reverting billing for all
   * attendees. Returns a summary of the deleted series (representative
   * occurrence + count) so the controller can write a single journal entry.
   */
  async removeSeries(
    userId: string,
    recurringId: string,
  ): Promise<{
    removed: number
    groupId: string | null
    studentId: string | null
    date: string | null
    time: string | null
  }> {
    const trainings = await this.trainingModel.findAll({
      where: { userId, recurringId },
      include: [Student],
      order: [['date', 'ASC']],
    })
    const first = trainings[0] ?? null
    for (const t of trainings) {
      const attendeeIds = (t.attendees ?? []).map((s) => s.id)
      for (const studentId of attendeeIds) {
        await this.revertVisit(t, studentId)
      }
      await this.calendarSync.enqueueDelete(userId, t.id)
      // Удаление занятия делает его «создание» необратимым — как и одиночное.
      await this.activityLog.markTrainingCreatedUndone(t.id)
      await t.destroy()
    }
    return {
      removed: trainings.length,
      groupId: first?.groupId ?? null,
      studentId: first?.plannedStudentId ?? first?.attendees?.[0]?.id ?? null,
      date: first?.date ?? null,
      time: first?.time ?? null,
    }
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

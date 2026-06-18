import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { Transaction } from 'sequelize'

import { SUB_TYPE_TOTALS } from '@trikick/shared'
import type { DeductStatus, SubscriptionType, TimeSlot } from '@trikick/shared'

import { DateUtil } from '../../common/utils/date.util'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { Payment } from '../finance/payment.model'
import { covers, pickSubForDeduct } from './lib/pick-subscription'
import { Subscription } from './subscription.model'

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription) private readonly subModel: typeof Subscription,
    @InjectModel(Payment) private readonly paymentModel: typeof Payment,
    private readonly activityLog: ActivityLogService,
  ) {}

  async add(
    studentId: string,
    data: {
      groupId: string
      type: SubscriptionType
      sessionsTotal?: number
      isPair?: boolean
      createdAt?: string
      sessionDuration?: number
      validityDays?: number
      timeSlot?: TimeSlot
      groupIds?: string[]
    },
  ): Promise<Subscription> {
    // Число занятий: явное из тарифа (кастомный абонемент) → по типу (легаси) → 1.
    const total = data.sessionsTotal ?? SUB_TYPE_TOTALS[data.type] ?? 1
    const createdAt = data.createdAt ?? DateUtil.todayIso()
    const validityDays = data.validityDays ?? 35
    // Покрываемые группы: для общего — переданный список, иначе только своя.
    const groupIds = data.groupIds?.length ? data.groupIds : [data.groupId]
    return this.subModel.create({
      studentId,
      groupId: data.groupId,
      type: data.type,
      total,
      remaining: total,
      expiresAt: DateUtil.addDays(createdAt, validityDays),
      isActive: true,
      finPaymentId: null,
      sessionDuration: data.sessionDuration ?? 60,
      timeSlot: data.timeSlot ?? 'regular',
      groupIds,
      isPair: data.isPair ?? false,
    })
  }

  /** Deduct one session from the active subscription for a group. */
  async deduct(
    studentId: string,
    groupId: string,
    sessionDuration: number | null = null,
    tx: Transaction | null = null,
    wantPair = false,
  ): Promise<{ sub: Subscription | null; status: DeductStatus }> {
    // Выбор абонемента — чистая функция pickSubForDeduct («свой» по длительности
    // → любой «свой» → общий). Истёкшие по сроку отсеиваются: isActive снимается
    // только при remaining=0, по дате его никто не деактивирует, поэтому без
    // фильтра здесь списание уходило на протухший абонемент вместо авто-платежа.
    // В транзакции строки блокируются (FOR UPDATE) — параллельные отметки не
    // прочитают один и тот же remaining.
    const subs = await this.subModel.findAll({
      where: { studentId, isActive: true },
      ...(tx ? { transaction: tx, lock: tx.LOCK.UPDATE } : {}),
    })
    const sub = pickSubForDeduct(subs, groupId, sessionDuration, DateUtil.todayIso(), wantPair)
    if (!sub) return { sub: null, status: 'none' }

    sub.remaining -= 1
    if (sub.remaining <= 0) {
      sub.remaining = 0
      sub.isActive = false
    }
    await sub.save({ transaction: tx ?? undefined })

    let status: DeductStatus = 'ok'
    if (!sub.isActive) status = 'expired'
    else if (sub.remaining <= 2) status = 'ending'
    return { sub, status }
  }

  /** Restore one session (used when removing a student from a training). */
  async restore(
    studentId: string,
    groupId: string,
    sessionDuration: number | null = null,
  ): Promise<Subscription | null> {
    const sub = await this.findActiveOrLatest(studentId, groupId, sessionDuration)
    if (!sub) return null
    sub.remaining = Math.min(sub.remaining + 1, sub.total)
    if (sub.remaining > 0) sub.isActive = true
    await sub.save()
    return sub
  }

  /** Точечный возврат занятия на конкретный абонемент (откат отметки). */
  async restoreById(
    subscriptionId: string,
    tx: Transaction | null = null,
  ): Promise<Subscription | null> {
    const sub = await this.subModel.findByPk(subscriptionId, {
      ...(tx ? { transaction: tx, lock: tx.LOCK.UPDATE } : {}),
    })
    if (!sub) return null
    sub.remaining = Math.min(sub.remaining + 1, sub.total)
    if (sub.remaining > 0) sub.isActive = true
    await sub.save({ transaction: tx ?? undefined })
    return sub
  }

  async extend(studentId: string, groupId: string, days: number): Promise<Subscription> {
    const sub = await this.findActiveOrLatest(studentId, groupId)
    if (!sub) throw new NotFoundException('Абонемент не найден')

    const today = DateUtil.todayIso()
    const base = sub.expiresAt > today ? sub.expiresAt : today
    sub.expiresAt = DateUtil.addDays(base, days)
    if (sub.remaining > 0) sub.isActive = true
    await sub.save()
    return sub
  }

  async remove(studentId: string, subId: string): Promise<void> {
    const sub = await this.subModel.findOne({ where: { id: subId, studentId } })
    if (!sub) throw new NotFoundException('Абонемент не найден')
    await sub.destroy()
    await this.activityLog.markSubscriptionUndone(subId)
  }

  async linkPayment(
    userId: string,
    studentId: string,
    subId: string,
    paymentId: string,
  ): Promise<void> {
    // Владение обязательно: абонемент — именно этого ученика, платёж — этого
    // тренера. Раньше можно было пометить «оплаченным» чужой абонемент (IDOR).
    const sub = await this.subModel.findOne({ where: { id: subId, studentId } })
    if (!sub) throw new NotFoundException('Абонемент не найден')
    const payment = await this.paymentModel.findOne({ where: { id: paymentId, userId } })
    if (!payment) throw new NotFoundException('Платёж не найден')
    await sub.update({ finPaymentId: paymentId })
  }

  private async findActiveOrLatest(
    studentId: string,
    groupId: string,
    sessionDuration: number | null = null,
  ): Promise<Subscription | null> {
    // Предпочитаем «свой» абонемент группы (с совпадающей длительностью, затем
    // любой), затем общий, покрывающий группу; сначала активные, потом — самый
    // свежий из неактивных. Зеркально логике списания.
    const subs = await this.subModel.findAll({
      where: { studentId },
      order: [['createdAt', 'DESC']],
    })
    const active = subs.filter((s) => s.isActive)
    const byPreference = (pool: Subscription[]): Subscription | undefined =>
      (sessionDuration !== null
        ? pool.find((s) => s.groupId === groupId && s.sessionDuration === sessionDuration)
        : undefined) ??
      pool.find((s) => s.groupId === groupId) ??
      pool.find((s) => covers(s, groupId))
    return byPreference(active) ?? byPreference(subs) ?? null
  }
}

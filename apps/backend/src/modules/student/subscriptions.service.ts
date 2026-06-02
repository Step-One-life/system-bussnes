import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import { SUB_TYPE_TOTALS } from '@trikick/shared'
import type { DeductStatus, SubscriptionType, TimeSlot } from '@trikick/shared'

import { DateUtil } from '../../common/utils/date.util'
import { Subscription } from './subscription.model'

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription) private readonly subModel: typeof Subscription,
  ) {}

  async add(
    studentId: string,
    data: {
      groupId: string
      type: SubscriptionType
      createdAt?: string
      sessionDuration?: number
      validityDays?: number
      timeSlot?: TimeSlot
      groupIds?: string[]
    },
  ): Promise<Subscription> {
    const total = SUB_TYPE_TOTALS[data.type] ?? 1
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
    })
  }

  /** Покрывает ли абонемент данную группу (общий — по списку group_ids). */
  private covers(sub: Subscription, groupId: string): boolean {
    return sub.groupIds?.length ? sub.groupIds.includes(groupId) : sub.groupId === groupId
  }

  /** Deduct one session from the active subscription for a group. */
  async deduct(
    studentId: string,
    groupId: string,
    sessionDuration: number | null = null,
  ): Promise<{ sub: Subscription | null; status: DeductStatus }> {
    // Порядок выбора: (1) «свой» абонемент группы с совпадающей длительностью
    // (держит индив. 60/90 раздельно), (2) любой «свой» абонемент группы,
    // (3) общий абонемент, покрывающий группу (длительность не важна, 1 визит =
    // 1 занятие). Грузим активные абонементы ученика и выбираем в памяти.
    const subs = await this.subModel.findAll({ where: { studentId, isActive: true } })
    const sub =
      (sessionDuration !== null
        ? subs.find((s) => s.groupId === groupId && s.sessionDuration === sessionDuration)
        : undefined) ??
      subs.find((s) => s.groupId === groupId) ??
      subs.find((s) => this.covers(s, groupId))
    if (!sub) return { sub: null, status: 'none' }

    sub.remaining -= 1
    if (sub.remaining <= 0) {
      sub.remaining = 0
      sub.isActive = false
    }
    await sub.save()

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
  }

  async linkPayment(subId: string, paymentId: string): Promise<void> {
    await this.subModel.update({ finPaymentId: paymentId }, { where: { id: subId } })
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
      pool.find((s) => this.covers(s, groupId))
    return byPreference(active) ?? byPreference(subs) ?? null
  }
}

import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import type { DeductStatus, SubscriptionType } from '@trikick/shared'

import { DateUtil } from '../../common/utils/date.util'
import { Subscription } from './subscription.model'

const SUB_TYPE_TOTALS: Record<SubscriptionType, number> = {
  '1': 1,
  '4': 4,
  '8': 8,
  '1_90': 1,
  '4_90': 4,
  '8_90': 8,
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription) private readonly subModel: typeof Subscription,
  ) {}

  async add(
    studentId: string,
    data: { groupId: string; type: SubscriptionType; createdAt?: string; sessionDuration?: number },
  ): Promise<Subscription> {
    const total = SUB_TYPE_TOTALS[data.type] ?? 1
    const createdAt = data.createdAt ?? DateUtil.todayIso()
    return this.subModel.create({
      studentId,
      groupId: data.groupId,
      type: data.type,
      total,
      remaining: total,
      expiresAt: DateUtil.addDays(createdAt, 35),
      isActive: true,
      finPaymentId: null,
      sessionDuration: data.sessionDuration ?? 60,
    })
  }

  /** Deduct one session from the active subscription for a group. */
  async deduct(
    studentId: string,
    groupId: string,
    sessionDuration: number | null = null,
  ): Promise<{ sub: Subscription | null; status: DeductStatus }> {
    const sub = await this.subModel.findOne({
      where: {
        studentId,
        groupId,
        isActive: true,
        ...(sessionDuration !== null ? { sessionDuration } : {}),
      },
    })
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
  async restore(studentId: string, groupId: string): Promise<Subscription | null> {
    const sub = await this.findActiveOrLatest(studentId, groupId)
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
  ): Promise<Subscription | null> {
    const active = await this.subModel.findOne({
      where: { studentId, groupId, isActive: true },
    })
    if (active) return active
    return this.subModel.findOne({
      where: { studentId, groupId },
      order: [['createdAt', 'DESC']],
    })
  }
}

import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { Transaction } from 'sequelize'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { DateUtil } from '../../common/utils/date.util'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { FIN_SESSIONS } from './finance.constants'
import { HallCostsService } from './hall-costs.service'
import { Payment } from './payment.model'

@Injectable()
export class PaymentsService extends OwnedCrudService<Payment> {
  protected readonly searchField: string | null = null

  constructor(
    @InjectModel(Payment) private readonly paymentModel: typeof Payment,
    private readonly hallCostsService: HallCostsService,
    private readonly activityLog: ActivityLogService,
  ) {
    super(paymentModel)
  }

  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
    tx: Transaction | null = null,
  ): Promise<Payment> {
    const sessions = FIN_SESSIONS[dto.clientPaymentType] ?? 1
    return this.paymentModel.create(
      {
        userId,
        studentId: dto.studentId ?? null,
        locationId: dto.locationId ?? null,
        clientPaymentType: dto.clientPaymentType,
        clientAmount: dto.clientAmount,
        sessionsTotal: sessions,
        sessionsRemaining: sessions,
        paidAt: dto.paidAt ?? DateUtil.todayIso(),
        status: 'active',
        notes: dto.notes ?? '',
        hallCostId: dto.hallCostId ?? null,
      },
      { transaction: tx ?? undefined },
    )
  }

  /** Delete payment + cascade its linked hall cost. */
  async removePayment(userId: string, id: string): Promise<void> {
    const payment = await this.findOneForUser(userId, id)
    if (payment.hallCostId) {
      await this.hallCostsService.removeForUser(userId, payment.hallCostId).catch(() => undefined)
    }
    await payment.destroy()
    await this.activityLog.markPaymentUndone(id)
  }
}

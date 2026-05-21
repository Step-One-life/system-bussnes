import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { DateUtil } from '../../common/utils/date.util'
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
  ) {
    super(paymentModel)
  }

  async createPayment(userId: string, dto: CreatePaymentDto): Promise<Payment> {
    const sessions = FIN_SESSIONS[dto.clientPaymentType] ?? 1
    return this.createForUser(userId, {
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
    })
  }

  /** Delete payment + cascade its linked hall cost. */
  async removePayment(userId: string, id: string): Promise<void> {
    const payment = await this.findOneForUser(userId, id)
    if (payment.hallCostId) {
      await this.hallCostsService.removeForUser(userId, payment.hallCostId).catch(() => undefined)
    }
    await payment.destroy()
  }
}

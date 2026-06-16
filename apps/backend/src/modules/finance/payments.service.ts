import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { Transaction } from 'sequelize'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { DateUtil } from '../../common/utils/date.util'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { Group } from '../group/group.model'
import { Location } from '../location/location.model'
import { Student } from '../student/student.model'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { FIN_SESSIONS } from './finance.constants'
import { HallCostsService } from './hall-costs.service'
import { Payment } from './payment.model'

@Injectable()
export class PaymentsService extends OwnedCrudService<Payment> {
  protected readonly searchField: string | null = null

  constructor(
    @InjectModel(Payment) private readonly paymentModel: typeof Payment,
    @InjectModel(Student) private readonly studentModel: typeof Student,
    @InjectModel(Location) private readonly locationModel: typeof Location,
    @InjectModel(Group) private readonly groupModel: typeof Group,
    private readonly hallCostsService: HallCostsService,
    private readonly activityLog: ActivityLogService,
  ) {
    super(paymentModel)
  }

  /**
   * Проверка владения ссылками платежа перед созданием из публичной ручки.
   * Вызывается контроллером, НЕ внутренним путём отметки: там id уже доверенные,
   * а hallCostId создаётся в той же незакоммиченной транзакции (проверка вне
   * tx его не увидела бы). Бросает 404 на чужой/несуществующий id (IDOR).
   */
  async assertRefsOwned(
    userId: string,
    refs: {
      studentId?: string | null
      locationId?: string | null
      groupId?: string | null
      hallCostId?: string | null
    },
  ): Promise<void> {
    if (refs.studentId) {
      const student = await this.studentModel.findOne({ where: { id: refs.studentId, userId } })
      if (!student) throw new NotFoundException('Ученик не найден')
    }
    if (refs.locationId) {
      const location = await this.locationModel.findOne({ where: { id: refs.locationId, userId } })
      if (!location) throw new NotFoundException('Локация не найдена')
    }
    if (refs.groupId) {
      const group = await this.groupModel.findOne({ where: { id: refs.groupId, userId } })
      if (!group) throw new NotFoundException('Группа не найдена')
    }
    if (refs.hallCostId) {
      // findOneForUser бросит 404 на чужой/несуществующий расход зала.
      await this.hallCostsService.findOneForUser(userId, refs.hallCostId)
    }
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
        groupId: dto.groupId ?? null,
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

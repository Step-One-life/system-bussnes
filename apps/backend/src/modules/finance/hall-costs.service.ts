import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { DateUtil } from '../../common/utils/date.util'
import { CreateHallCostDto } from './dto/create-hall-cost.dto'
import { FIN_SESSIONS } from './finance.constants'
import { HallCost } from './hall-cost.model'

@Injectable()
export class HallCostsService extends OwnedCrudService<HallCost> {
  protected readonly searchField: string | null = null

  constructor(@InjectModel(HallCost) private readonly hallCostModel: typeof HallCost) {
    super(hallCostModel)
  }

  async createHallCost(userId: string, dto: CreateHallCostDto): Promise<HallCost> {
    const sessions = FIN_SESSIONS[dto.hallPaymentType] ?? 1
    return this.createForUser(userId, {
      studentId: dto.studentId ?? null,
      hallPaymentType: dto.hallPaymentType,
      timeSlot: dto.timeSlot ?? 'regular',
      trainingTime: dto.trainingTime ?? '',
      hallAmount: dto.hallAmount,
      sessionsTotal: sessions,
      sessionsRemaining: sessions,
      paidAt: dto.paidAt ?? DateUtil.todayIso(),
      status: 'active',
      notes: dto.notes ?? '',
    })
  }
}

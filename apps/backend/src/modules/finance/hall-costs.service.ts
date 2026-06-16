import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { Transaction } from 'sequelize'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { DateUtil } from '../../common/utils/date.util'
import { Location } from '../location/location.model'
import { Student } from '../student/student.model'
import { CreateHallCostDto } from './dto/create-hall-cost.dto'
import { FIN_SESSIONS } from './finance.constants'
import { HallCost } from './hall-cost.model'

@Injectable()
export class HallCostsService extends OwnedCrudService<HallCost> {
  protected readonly searchField: string | null = null

  constructor(
    @InjectModel(HallCost) private readonly hallCostModel: typeof HallCost,
    @InjectModel(Student) private readonly studentModel: typeof Student,
    @InjectModel(Location) private readonly locationModel: typeof Location,
  ) {
    super(hallCostModel)
  }

  /**
   * Проверка владения ссылками расхода зала перед созданием из публичной ручки
   * (вызывается контроллером, не внутренним путём отметки). Бросает 404 на
   * чужой/несуществующий ученик/локацию (IDOR).
   */
  async assertRefsOwned(
    userId: string,
    refs: { studentId?: string | null; locationId?: string | null },
  ): Promise<void> {
    if (refs.studentId) {
      const student = await this.studentModel.findOne({ where: { id: refs.studentId, userId } })
      if (!student) throw new NotFoundException('Ученик не найден')
    }
    if (refs.locationId) {
      const location = await this.locationModel.findOne({ where: { id: refs.locationId, userId } })
      if (!location) throw new NotFoundException('Локация не найдена')
    }
  }

  async createHallCost(
    userId: string,
    dto: CreateHallCostDto,
    tx: Transaction | null = null,
  ): Promise<HallCost> {
    const sessions = FIN_SESSIONS[dto.hallPaymentType] ?? 1
    return this.hallCostModel.create(
      {
        userId,
        studentId: dto.studentId ?? null,
        locationId: dto.locationId ?? null,
        hallPaymentType: dto.hallPaymentType,
        timeSlot: dto.timeSlot ?? 'regular',
        trainingTime: dto.trainingTime ?? '',
        hallAmount: dto.hallAmount,
        sessionsTotal: sessions,
        sessionsRemaining: sessions,
        paidAt: dto.paidAt ?? DateUtil.todayIso(),
        status: 'active',
        notes: dto.notes ?? '',
      },
      { transaction: tx ?? undefined },
    )
  }
}

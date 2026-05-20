import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import { Pricing } from './pricing.model'

@Injectable()
export class PricingService {
  constructor(@InjectModel(Pricing) private readonly pricingModel: typeof Pricing) {}

  async get(userId: string): Promise<Record<string, number>> {
    const row = await this.pricingModel.findOne({ where: { userId } })
    return row?.data ?? {}
  }

  /** Upsert — one pricing row per user. */
  async save(userId: string, data: Record<string, number>): Promise<Record<string, number>> {
    const existing = await this.pricingModel.findOne({ where: { userId } })
    if (existing) {
      await existing.update({ data })
      return existing.data
    }
    const created = await this.pricingModel.create({ userId, data })
    return created.data
  }
}

import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import { HallCost } from './hall-cost.model'
import { Payment } from './payment.model'

export interface FinanceStats {
  income: number
  expense: number
  profit: number
  margin: number
  paymentsCount: number
  hallCostsCount: number
}

@Injectable()
export class FinanceStatsService {
  constructor(
    @InjectModel(Payment) private readonly paymentModel: typeof Payment,
    @InjectModel(HallCost) private readonly hallCostModel: typeof HallCost,
  ) {}

  /** Aggregate income/expense/profit for a user, optionally since `from`. */
  async getStats(userId: string, from?: string): Promise<FinanceStats> {
    const payments = await this.paymentModel.findAll({ where: { userId } })
    const hallCosts = await this.hallCostModel.findAll({ where: { userId } })

    const inRange = (date: string) => !from || date >= from
    const paid = payments.filter((p) => inRange(p.paidAt))
    const costs = hallCosts.filter((c) => inRange(c.paidAt))

    const income = paid.reduce((sum, p) => sum + Number(p.clientAmount), 0)
    const expense = costs.reduce((sum, c) => sum + Number(c.hallAmount), 0)
    const profit = income - expense
    const margin = income > 0 ? Math.round((profit / income) * 100) : 0

    return {
      income,
      expense,
      profit,
      margin,
      paymentsCount: paid.length,
      hallCostsCount: costs.length,
    }
  }
}

import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { FinanceController } from './finance.controller'
import { FinanceStatsService } from './finance-stats.service'
import { HallCost } from './hall-cost.model'
import { HallCostsService } from './hall-costs.service'
import { Payment } from './payment.model'
import { PaymentsService } from './payments.service'
import { Pricing } from './pricing.model'
import { PricingService } from './pricing.service'

@Module({
  imports: [SequelizeModule.forFeature([Payment, HallCost, Pricing])],
  controllers: [FinanceController],
  providers: [PaymentsService, HallCostsService, PricingService, FinanceStatsService],
  exports: [PaymentsService, HallCostsService, SequelizeModule],
})
export class FinanceModule {}

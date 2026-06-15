import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { ActivityLogModule } from '../activity-log/activity-log.module'
import { Location } from '../location/location.model'
import { FinanceController } from './finance.controller'
import { FinanceStatsService } from './finance-stats.service'
import { HallCost } from './hall-cost.model'
import { HallCostsService } from './hall-costs.service'
import { Payment } from './payment.model'
import { PaymentsService } from './payments.service'
import { PricingRule } from './pricing-rule.model'
import { PricingRulesService } from './pricing-rules.service'

@Module({
  imports: [
    SequelizeModule.forFeature([Payment, HallCost, PricingRule, Location]),
    ActivityLogModule,
  ],
  controllers: [FinanceController],
  providers: [
    PaymentsService,
    HallCostsService,
    PricingRulesService,
    FinanceStatsService,
  ],
  exports: [PaymentsService, HallCostsService, PricingRulesService, SequelizeModule],
})
export class FinanceModule {}

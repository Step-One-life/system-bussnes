import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { FinanceModule } from '../finance/finance.module'
import { StudentModule } from '../student/student.module'
import { Subscription } from '../student/subscription.model'
import { TrainingModule } from '../training/training.module'
import { ActivityLogController } from './activity-log.controller'
import { ActivityLogModule } from './activity-log.module'
import { ActivityUndoService } from './activity-undo.service'

@Module({
  imports: [
    SequelizeModule.forFeature([Subscription]),
    ActivityLogModule,
    TrainingModule,
    StudentModule,
    FinanceModule,
  ],
  controllers: [ActivityLogController],
  providers: [ActivityUndoService],
})
export class ActivityUndoModule {}

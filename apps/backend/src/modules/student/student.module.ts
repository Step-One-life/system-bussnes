import { forwardRef, Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { ActivityLogModule } from '../activity-log/activity-log.module'
import { Payment } from '../finance/payment.model'
import { Group } from '../group/group.model'
import { TrainingModule } from '../training/training.module'
import { StudentController } from './student.controller'
import { Student } from './student.model'
import { StudentGroup } from './student-group.model'
import { StudentService } from './student.service'
import { Subscription } from './subscription.model'
import { SubscriptionsService } from './subscriptions.service'
import { Visit } from './visit.model'

@Module({
  // forwardRef: TrainingModule импортирует StudentModule, а удаление ученика
  // должно доменно снимать его плановые занятия (иначе висячие ссылки).
  imports: [
    forwardRef(() => TrainingModule),
    SequelizeModule.forFeature([Student, StudentGroup, Subscription, Visit, Payment, Group]),
    ActivityLogModule,
  ],
  controllers: [StudentController],
  providers: [StudentService, SubscriptionsService],
  exports: [StudentService, SubscriptionsService, SequelizeModule],
})
export class StudentModule {}

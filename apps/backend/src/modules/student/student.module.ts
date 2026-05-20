import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { StudentController } from './student.controller'
import { Student } from './student.model'
import { StudentGroup } from './student-group.model'
import { StudentService } from './student.service'
import { Subscription } from './subscription.model'
import { SubscriptionsService } from './subscriptions.service'
import { Visit } from './visit.model'

@Module({
  imports: [SequelizeModule.forFeature([Student, StudentGroup, Subscription, Visit])],
  controllers: [StudentController],
  providers: [StudentService, SubscriptionsService],
  exports: [StudentService, SubscriptionsService, SequelizeModule],
})
export class StudentModule {}

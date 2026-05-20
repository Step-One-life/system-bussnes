import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { StudentModule } from '../student/student.module'
import { TrainingController } from './training.controller'
import { Training } from './training.model'
import { TrainingAttendee } from './training-attendee.model'
import { TrainingService } from './training.service'

@Module({
  imports: [SequelizeModule.forFeature([Training, TrainingAttendee]), StudentModule],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService, SequelizeModule],
})
export class TrainingModule {}

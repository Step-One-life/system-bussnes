import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { CalendarModule } from '../calendar/calendar.module'
import { LocationModule } from '../location/location.module'
import { StudentModule } from '../student/student.module'
import { TrainingController } from './training.controller'
import { Training } from './training.model'
import { TrainingAttendee } from './training-attendee.model'
import { TrainingService } from './training.service'

@Module({
  imports: [
    SequelizeModule.forFeature([Training, TrainingAttendee]),
    StudentModule,
    LocationModule,
    CalendarModule,
  ],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService, SequelizeModule],
})
export class TrainingModule {}

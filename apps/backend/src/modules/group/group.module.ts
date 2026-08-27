import { forwardRef, Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { Location } from '../location/location.model'
import { TrainingModule } from '../training/training.module'
import { Student } from '../student/student.model'
import { Subscription } from '../student/subscription.model'
import { GroupController } from './group.controller'
import { Group } from './group.model'
import { GroupService } from './group.service'

@Module({
  // forwardRef: TrainingModule импортирует GroupModule, а удаление группы
  // должно идти через доменную зачистку занятий (откат биллинга + календарь).
  imports: [
    SequelizeModule.forFeature([Group, Subscription, Student, Location]),
    forwardRef(() => TrainingModule),
  ],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService, SequelizeModule],
})
export class GroupModule {}

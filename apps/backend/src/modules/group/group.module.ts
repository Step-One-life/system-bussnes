import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { Location } from '../location/location.model'
import { Student } from '../student/student.model'
import { Subscription } from '../student/subscription.model'
import { GroupController } from './group.controller'
import { Group } from './group.model'
import { GroupService } from './group.service'

@Module({
  imports: [SequelizeModule.forFeature([Group, Subscription, Student, Location])],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService, SequelizeModule],
})
export class GroupModule {}

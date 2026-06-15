import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { Group } from '../group/group.model'
import { Student } from '../student/student.model'
import { ActivityLog } from './activity-log.model'
import { ActivityLogService } from './activity-log.service'

@Module({
  imports: [SequelizeModule.forFeature([ActivityLog, Student, Group])],
  providers: [ActivityLogService],
  exports: [ActivityLogService, SequelizeModule],
})
export class ActivityLogModule {}

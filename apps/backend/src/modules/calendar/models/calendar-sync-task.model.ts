import { Column, DataType, Table } from 'sequelize-typescript'

import { BaseEntity } from '../../../common/entities/base.entity'
import type { SyncOperation, SyncTaskStatus } from '../calendar.constants'

@Table({ tableName: 'calendar_sync_tasks' })
export class CalendarSyncTask extends BaseEntity {
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string

  @Column({ field: 'training_id', type: DataType.UUID, allowNull: false })
  declare trainingId: string

  @Column({ type: DataType.STRING, allowNull: false })
  declare operation: SyncOperation

  @Column({ field: 'calendar_id', type: DataType.STRING, allowNull: true })
  declare calendarId: string | null

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'pending' })
  declare status: SyncTaskStatus

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare attempts: number

  @Column({ field: 'last_error', type: DataType.TEXT, allowNull: true })
  declare lastError: string | null

  @Column({ field: 'run_after', type: DataType.DATE, allowNull: false })
  declare runAfter: Date
}

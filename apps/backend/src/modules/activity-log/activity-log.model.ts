import { Column, DataType, Table } from 'sequelize-typescript'

import type { ActivitySummary, ActivityType } from '@trikick/shared'

import { BaseEntity } from '../../common/entities/base.entity'

@Table({ tableName: 'activity_logs' })
export class ActivityLog extends BaseEntity {
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string

  @Column({ type: DataType.STRING, allowNull: false })
  declare type: ActivityType

  @Column({ field: 'batch_id', type: DataType.UUID, allowNull: true })
  declare batchId: string | null

  @Column({ field: 'training_id', type: DataType.UUID, allowNull: true })
  declare trainingId: string | null

  @Column({ field: 'student_id', type: DataType.UUID, allowNull: true })
  declare studentId: string | null

  @Column({ field: 'subscription_id', type: DataType.UUID, allowNull: true })
  declare subscriptionId: string | null

  @Column({ field: 'payment_id', type: DataType.UUID, allowNull: true })
  declare paymentId: string | null

  @Column({ type: DataType.JSON, allowNull: false })
  declare summary: ActivitySummary

  @Column({ field: 'undone_at', type: DataType.DATE, allowNull: true })
  declare undoneAt: Date | null
}

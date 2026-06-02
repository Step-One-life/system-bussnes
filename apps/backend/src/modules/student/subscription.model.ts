import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript'

import type { SubscriptionType, TimeSlot } from '@trikick/shared'

import { BaseEntity } from '../../common/entities/base.entity'
import { Group } from '../group/group.model'
import { Student } from './student.model'

@Table({ tableName: 'subscriptions' })
export class Subscription extends BaseEntity {
  @ForeignKey(() => Student)
  @Column({ field: 'student_id', type: DataType.UUID, allowNull: false })
  declare studentId: string

  @BelongsTo(() => Student)
  declare student?: Student

  @ForeignKey(() => Group)
  @Column({ field: 'group_id', type: DataType.UUID, allowNull: false })
  declare groupId: string

  @Column({ type: DataType.STRING, allowNull: false })
  declare type: SubscriptionType

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare total: number

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare remaining: number

  @Column({ field: 'expires_at', type: DataType.DATEONLY, allowNull: false })
  declare expiresAt: string

  @Column({ field: 'is_active', type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare isActive: boolean

  @Column({ field: 'fin_payment_id', type: DataType.UUID, allowNull: true })
  declare finPaymentId: string | null

  @Column({ field: 'session_duration', type: DataType.INTEGER, allowNull: false, defaultValue: 60 })
  declare sessionDuration: number

  @Column({ field: 'time_slot', type: DataType.STRING, allowNull: false, defaultValue: 'regular' })
  declare timeSlot: TimeSlot

  @Column({ field: 'group_ids', type: DataType.JSON, allowNull: true })
  declare groupIds: string[] | null
}

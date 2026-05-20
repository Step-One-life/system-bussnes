import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript'

import type { FinStatus, HallPaymentType, TimeSlot } from '@trikick/shared'

import { OwnedEntity } from '../../common/entities/owned.entity'
import { Student } from '../student/student.model'
import { User } from '../user/user.model'

@Table({ tableName: 'hall_costs' })
export class HallCost extends OwnedEntity {
  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string

  @ForeignKey(() => Student)
  @Column({ field: 'student_id', type: DataType.UUID, allowNull: true })
  declare studentId: string | null

  @Column({ field: 'hall_payment_type', type: DataType.STRING, allowNull: false })
  declare hallPaymentType: HallPaymentType

  @Column({ field: 'time_slot', type: DataType.STRING, allowNull: false, defaultValue: 'regular' })
  declare timeSlot: TimeSlot

  @Column({ field: 'training_time', type: DataType.STRING, allowNull: false, defaultValue: '' })
  declare trainingTime: string

  @Column({ field: 'hall_amount', type: DataType.DECIMAL(10, 2), allowNull: false })
  declare hallAmount: number

  @Column({ field: 'sessions_total', type: DataType.INTEGER, allowNull: false })
  declare sessionsTotal: number

  @Column({ field: 'sessions_remaining', type: DataType.INTEGER, allowNull: false })
  declare sessionsRemaining: number

  @Column({ field: 'paid_at', type: DataType.DATEONLY, allowNull: false })
  declare paidAt: string

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'active' })
  declare status: FinStatus

  @Column({ type: DataType.TEXT, allowNull: true })
  declare notes: string
}

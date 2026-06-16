import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript'

import type { ClientPaymentType, FinStatus } from '@trikick/shared'

import { OwnedEntity } from '../../common/entities/owned.entity'
import { Student } from '../student/student.model'
import { User } from '../user/user.model'

@Table({ tableName: 'payments' })
export class Payment extends OwnedEntity {
  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string

  @ForeignKey(() => Student)
  @Column({ field: 'student_id', type: DataType.UUID, allowNull: true })
  declare studentId: string | null

  @Column({ field: 'location_id', type: DataType.UUID, allowNull: true })
  declare locationId: string | null

  @Column({ field: 'group_id', type: DataType.UUID, allowNull: true })
  declare groupId: string | null

  @Column({ field: 'client_payment_type', type: DataType.STRING, allowNull: false })
  declare clientPaymentType: ClientPaymentType

  @Column({ field: 'client_amount', type: DataType.DECIMAL(10, 2), allowNull: false })
  declare clientAmount: number

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

  @Column({ field: 'hall_cost_id', type: DataType.UUID, allowNull: true })
  declare hallCostId: string | null
}

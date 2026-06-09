import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript'

import { BaseEntity } from '../../common/entities/base.entity'
import { Group } from '../group/group.model'
import { Student } from './student.model'

/** Чем оплачено посещение. NULL — легаси-визит, созданный до ввода биллинга. */
export type VisitBilling = 'subscription' | 'payment' | 'none'

@Table({ tableName: 'visits' })
export class Visit extends BaseEntity {
  @ForeignKey(() => Student)
  @Column({ field: 'student_id', type: DataType.UUID, allowNull: false })
  declare studentId: string

  @ForeignKey(() => Group)
  @Column({ field: 'group_id', type: DataType.UUID, allowNull: false })
  declare groupId: string

  @Column({ field: 'training_id', type: DataType.UUID, allowNull: true })
  declare trainingId: string | null

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare date: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare billing: VisitBilling | null

  @Column({ field: 'subscription_id', type: DataType.UUID, allowNull: true })
  declare subscriptionId: string | null

  @Column({ field: 'payment_id', type: DataType.UUID, allowNull: true })
  declare paymentId: string | null
}

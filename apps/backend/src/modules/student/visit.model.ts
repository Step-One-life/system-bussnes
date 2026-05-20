import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript'

import { BaseEntity } from '../../common/entities/base.entity'
import { Group } from '../group/group.model'
import { Student } from './student.model'

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
}

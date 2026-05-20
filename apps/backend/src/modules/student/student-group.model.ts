import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'

import { Group } from '../group/group.model'
import { Student } from './student.model'

/** M:N join table — student ↔ group. */
@Table({ tableName: 'student_groups', timestamps: false })
export class StudentGroup extends Model {
  @ForeignKey(() => Student)
  @Column({ field: 'student_id', type: DataType.UUID, primaryKey: true })
  declare studentId: string

  @ForeignKey(() => Group)
  @Column({ field: 'group_id', type: DataType.UUID, primaryKey: true })
  declare groupId: string
}

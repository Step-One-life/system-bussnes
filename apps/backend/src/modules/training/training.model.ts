import { BelongsToMany, Column, DataType, ForeignKey, Table } from 'sequelize-typescript'

import { OwnedEntity } from '../../common/entities/owned.entity'
import { Group } from '../group/group.model'
import { Student } from '../student/student.model'
import { User } from '../user/user.model'
import { TrainingAttendee } from './training-attendee.model'

@Table({ tableName: 'trainings' })
export class Training extends OwnedEntity {
  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string

  @ForeignKey(() => Group)
  @Column({ field: 'group_id', type: DataType.UUID, allowNull: false })
  declare groupId: string

  @Column({ field: 'location_id', type: DataType.UUID, allowNull: true })
  declare locationId: string | null

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare date: string

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: '' })
  declare time: string

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: '' })
  declare note: string

  @Column({ field: 'is_prime', type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isPrime: boolean

  @Column({ field: 'session_duration', type: DataType.INTEGER, allowNull: false, defaultValue: 60 })
  declare sessionDuration: number

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare recurring: boolean

  @Column({ field: 'recurring_id', type: DataType.UUID, allowNull: true })
  declare recurringId: string | null

  @Column({ field: 'is_online', type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isOnline: boolean

  @Column({ field: 'planned_student_id', type: DataType.UUID, allowNull: true })
  declare plannedStudentId: string | null

  @Column({ field: 'is_pair', type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isPair: boolean

  @Column({ field: 'planned_student_id_2', type: DataType.UUID, allowNull: true })
  declare plannedStudentId2: string | null

  @BelongsToMany(() => Student, () => TrainingAttendee)
  declare attendees?: Student[]
}

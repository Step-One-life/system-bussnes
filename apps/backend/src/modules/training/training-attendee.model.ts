import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'

import { Student } from '../student/student.model'
import { Training } from './training.model'

/** M:N join table — training ↔ student. */
@Table({ tableName: 'training_attendees', timestamps: false })
export class TrainingAttendee extends Model {
  @ForeignKey(() => Training)
  @Column({ field: 'training_id', type: DataType.UUID, primaryKey: true })
  declare trainingId: string

  @ForeignKey(() => Student)
  @Column({ field: 'student_id', type: DataType.UUID, primaryKey: true })
  declare studentId: string
}

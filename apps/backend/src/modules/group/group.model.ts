import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript'

import type { ScheduleEntry } from '@trikick/shared'

import { OwnedEntity } from '../../common/entities/owned.entity'
import { User } from '../user/user.model'

@Table({ tableName: 'groups' })
export class Group extends OwnedEntity {
  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string

  @BelongsTo(() => User)
  declare user?: User

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @Column({ type: DataType.JSON, allowNull: false, defaultValue: [] })
  declare schedule: ScheduleEntry[]

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 60 })
  declare duration: number

  @Column({ field: 'is_individual', type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isIndividual: boolean
}

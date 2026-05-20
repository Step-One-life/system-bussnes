import {
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Table,
} from 'sequelize-typescript'

import { OwnedEntity } from '../../common/entities/owned.entity'
import { Group } from '../group/group.model'
import { User } from '../user/user.model'
import { StudentGroup } from './student-group.model'
import { Subscription } from './subscription.model'
import { Visit } from './visit.model'

@Table({ tableName: 'students' })
export class Student extends OwnedEntity {
  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @BelongsToMany(() => Group, () => StudentGroup)
  declare groups?: Group[]

  @HasMany(() => Subscription)
  declare subscriptions?: Subscription[]

  @HasMany(() => Visit)
  declare visits?: Visit[]
}

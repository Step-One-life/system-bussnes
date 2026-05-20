import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript'

import { OwnedEntity } from '../../common/entities/owned.entity'
import { User } from '../user/user.model'

@Table({ tableName: 'pricing' })
export class Pricing extends OwnedEntity {
  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false, unique: true })
  declare userId: string

  @Column({ type: DataType.JSON, allowNull: false, defaultValue: {} })
  declare data: Record<string, number>
}

import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript'

import type { LocationKind } from '@trikick/shared'

import { OwnedEntity } from '../../common/entities/owned.entity'
import { User } from '../user/user.model'

@Table({ tableName: 'locations' })
export class Location extends OwnedEntity {
  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string

  @BelongsTo(() => User)
  declare user?: User

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare address: string | null

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'hall' })
  declare kind: LocationKind

  @Column({ field: 'is_default', type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isDefault: boolean

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare archived: boolean

  @Column({ field: 'prime_weekday_start', type: DataType.STRING(5), allowNull: true })
  declare primeWeekdayStart: string | null

  @Column({ field: 'prime_weekday_end', type: DataType.STRING(5), allowNull: true })
  declare primeWeekdayEnd: string | null

  @Column({ field: 'prime_weekend_start', type: DataType.STRING(5), allowNull: true })
  declare primeWeekendStart: string | null

  @Column({ field: 'prime_weekend_end', type: DataType.STRING(5), allowNull: true })
  declare primeWeekendEnd: string | null
}

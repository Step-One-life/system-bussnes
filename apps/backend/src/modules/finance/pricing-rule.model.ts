import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript'

import type { LessonKind, PricingFormat } from '@trikick/shared'

import { OwnedEntity } from '../../common/entities/owned.entity'
import { Location } from '../location/location.model'
import { User } from '../user/user.model'

/** Тариф локации — одна строка прайс-листа. Заменяет JSON-словарь pricing. */
@Table({ tableName: 'pricing_rules' })
export class PricingRule extends OwnedEntity {
  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string

  @ForeignKey(() => Location)
  @Column({ field: 'location_id', type: DataType.UUID, allowNull: false })
  declare locationId: string

  @BelongsTo(() => Location)
  declare location?: Location

  @Column({ type: DataType.STRING, allowNull: false })
  declare title: string

  @Column({ field: 'lesson_kind', type: DataType.STRING, allowNull: false })
  declare lessonKind: LessonKind

  @Column({ type: DataType.STRING, allowNull: false })
  declare format: PricingFormat

  @Column({ field: 'duration_minutes', type: DataType.INTEGER, allowNull: false, defaultValue: 60 })
  declare durationMinutes: number

  @Column({ field: 'sessions_count', type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  declare sessionsCount: number

  @Column({ field: 'client_price', type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  declare clientPrice: number

  @Column({
    field: 'client_prime_price',
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  declare clientPrimePrice: number

  @Column({ field: 'hall_cost', type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  declare hallCost: number

  @Column({
    field: 'hall_prime_cost',
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  declare hallPrimeCost: number

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare active: boolean
}

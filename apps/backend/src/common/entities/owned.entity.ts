import { Column, DataType } from 'sequelize-typescript'

import { BaseEntity } from './base.entity'

/**
 * Base model for entities owned by a user (multi-tenancy by trainer).
 * The `belongsTo(User)` association is declared in concrete models
 * to avoid circular imports.
 */
export abstract class OwnedEntity extends BaseEntity {
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false })
  declare userId: string
}

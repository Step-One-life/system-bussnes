import { Column, CreatedAt, DataType, Model, PrimaryKey, UpdatedAt } from 'sequelize-typescript'

/**
 * Base model — UUID primary key + timestamps.
 * Every domain model extends this (directly or via OwnedEntity).
 */
export abstract class BaseEntity extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string

  @CreatedAt
  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date

  @UpdatedAt
  @Column({ field: 'updated_at', type: DataType.DATE })
  declare updatedAt: Date
}

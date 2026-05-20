import { Column, DataType, Table } from 'sequelize-typescript'

import { BaseEntity } from '../../common/entities/base.entity'

@Table({ tableName: 'users' })
export class User extends BaseEntity {
  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare email: string

  @Column({ field: 'password_hash', type: DataType.STRING, allowNull: false })
  declare passwordHash: string
}

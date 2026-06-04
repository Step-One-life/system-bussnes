import { Column, DataType, Table } from 'sequelize-typescript'

import { BaseEntity } from '../../../common/entities/base.entity'
import type { ConnectionStatus } from '../calendar.constants'

@Table({ tableName: 'calendar_connections' })
export class CalendarConnection extends BaseEntity {
  @Column({ field: 'user_id', type: DataType.UUID, allowNull: false, unique: true })
  declare userId: string

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'google' })
  declare provider: string

  @Column({ field: 'refresh_token_enc', type: DataType.TEXT, allowNull: true })
  declare refreshTokenEnc: string | null

  @Column({ field: 'calendar_id', type: DataType.STRING, allowNull: true })
  declare calendarId: string | null

  @Column({ field: 'calendar_time_zone', type: DataType.STRING, allowNull: true })
  declare calendarTimeZone: string | null

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'disconnected' })
  declare status: ConnectionStatus
}

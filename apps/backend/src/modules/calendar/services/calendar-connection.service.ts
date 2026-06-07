import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import type { ConnectionStatus } from '../calendar.constants'
import { CalendarConnection } from '../models/calendar-connection.model'
import { TokenCryptoService } from './token-crypto.service'

@Injectable()
export class CalendarConnectionService {
  constructor(
    @InjectModel(CalendarConnection)
    private readonly model: typeof CalendarConnection,
    private readonly crypto: TokenCryptoService,
  ) {}

  findByUser(userId: string): Promise<CalendarConnection | null> {
    return this.model.findOne({ where: { userId } })
  }

  /** Тренер «подключён», если есть refresh-токен, выбран календарь и статус connected. */
  async isActive(userId: string): Promise<boolean> {
    const c = await this.findByUser(userId)
    return !!c && c.status === 'connected' && !!c.calendarId && !!c.refreshTokenEnc
  }

  /** Сохранить refresh-токен после согласия (календарь ещё не выбран). */
  async saveTokens(userId: string, refreshToken: string): Promise<CalendarConnection> {
    const enc = this.crypto.encrypt(refreshToken)
    const existing = await this.findByUser(userId)
    if (existing) {
      existing.refreshTokenEnc = enc
      existing.status = 'connected'
      return existing.save()
    }
    return this.model.create({
      userId,
      provider: 'google',
      refreshTokenEnc: enc,
      status: 'connected',
    })
  }

  async setCalendar(userId: string, calendarId: string, timeZone: string): Promise<void> {
    await this.model.update({ calendarId, calendarTimeZone: timeZone }, { where: { userId } })
  }

  async setTimeZone(userId: string, timeZone: string): Promise<void> {
    await this.model.update({ calendarTimeZone: timeZone }, { where: { userId } })
  }

  async setStatus(userId: string, status: ConnectionStatus): Promise<void> {
    await this.model.update({ status }, { where: { userId } })
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const c = await this.findByUser(userId)
    return c?.refreshTokenEnc ? this.crypto.decrypt(c.refreshTokenEnc) : null
  }

  async disconnect(userId: string): Promise<void> {
    await this.model.update(
      { status: 'disconnected', refreshTokenEnc: null },
      { where: { userId } },
    )
  }
}

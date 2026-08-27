import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import type { ConnectionStatus } from '../calendar.constants'
import { CalendarConnection } from '../models/calendar-connection.model'
import { TokenCryptoService } from './token-crypto.service'

@Injectable()
export class CalendarConnectionService {
  private readonly logger = new Logger(CalendarConnectionService.name)

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

  /** Расшифровать refresh-токен уже загруженного соединения (без запроса к БД). */
  /**
   * Расшифровать refresh-токен соединения. Сбой расшифровки (сменили
   * CALENDAR_TOKEN_ENC_KEY, перешли с dev-фолбэка на боевой ключ, битая
   * строка) — это НЕ повод валить вызывающего: раньше исключение отсюда рвало
   * цикл воркера, задача не помечалась ни done, ни failed, выбиралась первой
   * каждые 20 секунд, и синхронизация вставала у ВСЕХ тренеров. Возвращаем
   * null — соединение честно уходит в needs_reconnect.
   */
  refreshTokenOf(conn: CalendarConnection | null): string | null {
    if (!conn?.refreshTokenEnc) return null
    try {
      return this.crypto.decrypt(conn.refreshTokenEnc)
    } catch (e) {
      this.logger.warn(
        `Не удалось расшифровать refresh-токен (userId=${conn.userId}): ${String(e)}`,
      )
      return null
    }
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    return this.refreshTokenOf(await this.findByUser(userId))
  }

  /**
   * Токен есть в базе, но расшифровать его нельзя (сменили ключ шифрования).
   * Снаружи это неотличимо от «не подключён», хотя лечится только повторным
   * OAuth — поэтому такое соединение сразу помечается needs_reconnect.
   */
  async isTokenBroken(userId: string): Promise<boolean> {
    const conn = await this.findByUser(userId)
    if (!conn?.refreshTokenEnc) return false
    if (this.refreshTokenOf(conn) !== null) return false
    await this.setStatus(userId, 'needs_reconnect')
    return true
  }

  async disconnect(userId: string): Promise<void> {
    await this.model.update(
      { status: 'disconnected', refreshTokenEnc: null },
      { where: { userId } },
    )
  }
}

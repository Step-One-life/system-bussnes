import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { FastifyReply } from 'fastify'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface'
import { SelectCalendarDto } from './dto/select-calendar.dto'
import { CalendarConnectionService } from './services/calendar-connection.service'
import { CalendarSyncService } from './services/calendar-sync.service'
import { GoogleOAuthService } from './services/google-oauth.service'

@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly google: GoogleOAuthService,
    private readonly connections: CalendarConnectionService,
    private readonly sync: CalendarSyncService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Состояние подключения для экрана настроек. */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@CurrentUser() user: CurrentUserPayload) {
    const c = await this.connections.findByUser(user.id)
    return {
      status: c?.status ?? 'disconnected',
      calendarId: c?.calendarId ?? null,
      calendarTimeZone: c?.calendarTimeZone ?? null,
    }
  }

  /** URL согласия Google (state = подписанный userId). */
  @Get('google/auth-url')
  @UseGuards(JwtAuthGuard)
  authUrl(@CurrentUser() user: CurrentUserPayload) {
    const state = this.jwt.sign({ sub: user.id })
    return { url: this.google.buildAuthUrl(state) }
  }

  /** Публичный редирект-приёмник от Google (без JWT — пользователь в state). */
  @Get('google/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const front = this.config.get<string>('frontendUrl') ?? 'http://localhost:3020'
    try {
      const { sub } = this.jwt.verify<{ sub: string }>(state)
      const refreshToken = await this.google.exchangeCode(code)
      await this.connections.saveTokens(sub, refreshToken)
      void reply.redirect(`${front}/settings?google=connected`)
    } catch {
      void reply.redirect(`${front}/settings?google=error`)
    }
  }

  /** Список календарей тренера для пикера. */
  @Get('calendars')
  @UseGuards(JwtAuthGuard)
  async calendars(@CurrentUser() user: CurrentUserPayload) {
    const token = await this.connections.getRefreshToken(user.id)
    if (!token) return { calendars: [] }
    return { calendars: await this.google.listCalendars(token) }
  }

  /** Выбрать существующий или создать новый календарь, затем бэкфилл. */
  @Post('select')
  @UseGuards(JwtAuthGuard)
  async select(@CurrentUser() user: CurrentUserPayload, @Body() dto: SelectCalendarDto) {
    const token = await this.connections.getRefreshToken(user.id)
    if (!token) return { ok: false }

    let calendarId = dto.calendarId ?? ''
    let timeZone = await this.google.primaryTimeZone(token)
    if (dto.create) {
      const created = await this.google.createCalendar(token, dto.name || 'TriKick', timeZone)
      calendarId = created.id
      timeZone = created.timeZone
    } else {
      const list = await this.google.listCalendars(token)
      timeZone = list.find((c) => c.id === calendarId)?.timeZone ?? timeZone
    }

    await this.connections.setCalendar(user.id, calendarId, timeZone)
    const count = await this.sync.backfill(user.id)
    return { ok: true, calendarId, backfilled: count }
  }

  /** Поставить в очередь повторную выгрузку всего расписания. */
  @Post('resync')
  @UseGuards(JwtAuthGuard)
  async resync(@CurrentUser() user: CurrentUserPayload) {
    return { backfilled: await this.sync.backfill(user.id) }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@CurrentUser() user: CurrentUserPayload) {
    await this.connections.disconnect(user.id)
    return { ok: true }
  }
}

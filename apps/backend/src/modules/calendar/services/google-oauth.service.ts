import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { google, type calendar_v3 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

import { GOOGLE_API_TIMEOUT_MS, GOOGLE_CALENDAR_SCOPE } from '../calendar.constants'
import type { GoogleEventResource } from '../lib/event-builder'

export interface CalendarSummary {
  id: string
  name: string
  primary: boolean
  timeZone: string
}

/** Ошибка, которую воркер трактует как «токен мёртв → нужно переподключение». */
export class CalendarAuthError extends Error {}

@Injectable()
export class GoogleOAuthService {
  constructor(private readonly config: ConfigService) {}

  private base(): OAuth2Client {
    return new google.auth.OAuth2(
      this.config.get<string>('google.clientId'),
      this.config.get<string>('google.clientSecret'),
      this.config.get<string>('google.redirectUri'),
    )
  }

  /** URL согласия Google. `state` — подписанный идентификатор пользователя. */
  buildAuthUrl(state: string): string {
    return this.base().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [GOOGLE_CALENDAR_SCOPE],
      state,
    })
  }

  /** Обмен кода на refresh-токен. */
  async exchangeCode(code: string): Promise<string> {
    const { tokens } = await this.base().getToken(code)
    if (!tokens.refresh_token) {
      throw new Error('Google не вернул refresh_token (нужен prompt=consent / offline access)')
    }
    return tokens.refresh_token
  }

  private client(refreshToken: string): calendar_v3.Calendar {
    const auth = this.base()
    auth.setCredentials({ refresh_token: refreshToken })
    // timeout распространяется на каждый запрос клиента (см. GOOGLE_API_TIMEOUT_MS).
    return google.calendar({ version: 'v3', auth, timeout: GOOGLE_API_TIMEOUT_MS })
  }

  async listCalendars(refreshToken: string): Promise<CalendarSummary[]> {
    const cal = this.client(refreshToken)
    const res = await this.wrapAuth(() => cal.calendarList.list({ maxResults: 250 }))
    return (res.data.items ?? [])
      // Только те, куда можно писать: подписной или чужой календарь выбирался
      // молча, а потом каждая выгрузка события возвращала 403.
      .filter((c) => c.accessRole === 'owner' || c.accessRole === 'writer')
      .map((c) => ({
        id: c.id ?? '',
        name: c.summary ?? c.id ?? '',
        primary: !!c.primary,
        timeZone: c.timeZone ?? 'Europe/Moscow',
      }))
  }

  /** Создать календарь, вернуть его id и пояс. */
  async createCalendar(
    refreshToken: string,
    name: string,
    timeZone: string,
  ): Promise<{ id: string; timeZone: string }> {
    const cal = this.client(refreshToken)
    const res = await this.wrapAuth(() =>
      cal.calendars.insert({ requestBody: { summary: name, timeZone } }),
    )
    return { id: res.data.id ?? '', timeZone: res.data.timeZone ?? timeZone }
  }

  /** Пояс основного календаря тренера (для выбора по умолчанию). */
  async primaryTimeZone(refreshToken: string): Promise<string> {
    const list = await this.listCalendars(refreshToken)
    return list.find((c) => c.primary)?.timeZone ?? 'Europe/Moscow'
  }

  /** Idempotent upsert: insert, при 409 — patch. */
  async upsertEvent(
    refreshToken: string,
    calendarId: string,
    event: GoogleEventResource,
  ): Promise<void> {
    const cal = this.client(refreshToken)
    try {
      await this.wrapAuth(() => cal.events.insert({ calendarId, requestBody: event }))
    } catch (e) {
      if (statusOf(e) === 409) {
        await this.wrapAuth(() =>
          cal.events.patch({ calendarId, eventId: event.id, requestBody: event }),
        )
        return
      }
      throw e
    }
  }

  /** Idempotent delete: 404/410 трактуем как успех. */
  async deleteEvent(refreshToken: string, calendarId: string, eventId: string): Promise<void> {
    const cal = this.client(refreshToken)
    try {
      await this.wrapAuth(() => cal.events.delete({ calendarId, eventId }))
    } catch (e) {
      const s = statusOf(e)
      if (s === 404 || s === 410) return
      throw e
    }
  }

  /**
   * Отличает отзыв доступа от временной ошибки Google.
   *
   * Раньше ЛЮБОЙ 403 считался отзывом прав: тренер выбирал подписной или
   * чужой календарь, каждый events.insert возвращал 403 «forbidden», и
   * соединение уходило в needs_reconnect — на экране висело «переподключите
   * Google» при полностью исправном токене, а поднять очередь мог только
   * повторный проход OAuth. Квоты и rate-limit приходят тем же 403 и должны
   * уходить в обычный бэкофф.
   */
  private async wrapAuth<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (e) {
      const s = statusOf(e)
      const msg = String((e as { message?: string })?.message ?? '')
      if (isAuthFailure(s, msg, reasonOf(e))) {
        throw new CalendarAuthError(msg || 'Доступ к Google отозван')
      }
      throw e
    }
  }
}

/** Причина ошибки из тела ответа Google (errors[0].reason). */
function reasonOf(e: unknown): string {
  const err = e as {
    errors?: { reason?: string }[]
    response?: { data?: { error?: { errors?: { reason?: string }[] } } }
  }
  return (
    err?.errors?.[0]?.reason ??
    err?.response?.data?.error?.errors?.[0]?.reason ??
    ''
  )
}

/** Причины 403, которые действительно означают потерю прав (а не квоту). */
const AUTH_REASONS = new Set([
  'insufficientPermissions',
  'forbiddenForServiceAccounts',
  'authError',
  'accessNotConfigured',
])

export function isAuthFailure(
  status: number | undefined,
  message: string,
  reason: string,
): boolean {
  if (status === 401) return true
  if (message.includes('invalid_grant')) return true
  // 403 сам по себе ничего не значит — решает reason.
  if (status === 403) return AUTH_REASONS.has(reason)
  return false
}

function statusOf(e: unknown): number | undefined {
  const err = e as { code?: number; status?: number; response?: { status?: number } }
  return err?.response?.status ?? err?.status ?? err?.code
}

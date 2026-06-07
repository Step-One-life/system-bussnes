import { apiClient } from 'common/services/api/api-client'

export type CalendarStatus = 'disconnected' | 'connected' | 'needs_reconnect'

export interface CalendarConnectionState {
  status: CalendarStatus
  calendarId: string | null
  calendarTimeZone: string | null
}

export interface CalendarOption {
  id: string
  name: string
  primary: boolean
  timeZone: string
}

export const calendarRepo = {
  getStatus: (): Promise<CalendarConnectionState> =>
    apiClient.get<CalendarConnectionState>('/calendar/status'),

  getAuthUrl: (): Promise<{ url: string }> =>
    apiClient.get<{ url: string }>('/calendar/google/auth-url'),

  listCalendars: (): Promise<{ calendars: CalendarOption[] }> =>
    apiClient.get<{ calendars: CalendarOption[] }>('/calendar/calendars'),

  select: (body: {
    calendarId?: string
    create?: boolean
    name?: string
    timeZone?: string
  }): Promise<unknown> => apiClient.post('/calendar/select', body),

  resync: (): Promise<{ backfilled: number }> =>
    apiClient.post<{ backfilled: number }>('/calendar/resync'),

  setTimeZone: (timeZone: string): Promise<{ backfilled: number }> =>
    apiClient.post<{ backfilled: number }>('/calendar/timezone', { timeZone }),

  disconnect: (): Promise<unknown> => apiClient.post('/calendar/disconnect'),
}

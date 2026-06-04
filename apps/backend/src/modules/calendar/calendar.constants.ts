export const CALENDAR_PROVIDER = 'google'

/** Управление календарями и событиями (список, создание календаря, события). */
export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'

export type ConnectionStatus = 'disconnected' | 'connected' | 'needs_reconnect'
export type SyncOperation = 'upsert' | 'delete'
export type SyncTaskStatus = 'pending' | 'done' | 'failed'

/** Воркер просыпается каждые N мс. */
export const SYNC_INTERVAL_MS = 20_000
/** Сколько задач берём за один проход. */
export const SYNC_BATCH = 25
/** Максимум попыток до статуса failed. */
export const SYNC_MAX_ATTEMPTS = 8

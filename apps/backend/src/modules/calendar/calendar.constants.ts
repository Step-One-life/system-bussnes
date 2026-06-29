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
/**
 * Бэкфилл выгружает занятия за последние N дней и все будущие. Прошлое нужно,
 * чтобы при первом подключении в календарь попало текущее расписание целиком,
 * а не только будущие даты (иначе уезжает почти пусто).
 */
export const SYNC_BACKFILL_LOOKBACK_DAYS = 90
/**
 * Лимит на один HTTP-вызов Google API. Без него зависший запрос блокирует
 * воркер навсегда (`running` не сбросится до ответа). По истечении gaxios
 * обрывает запрос с ошибкой → обычный retry с backoff.
 */
export const GOOGLE_API_TIMEOUT_MS = 15_000

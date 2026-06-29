import { DateUtil } from '../../../common/utils/date.util'

import type { ConnectionStatus } from '../calendar.constants'

/** Что воркер делает с задачей при текущем состоянии подключения. */
export type SyncTaskAction = 'skip' | 'defer' | 'sync'

/**
 * Решение по задаче синхронизации:
 * - skip  — синхронизация выключена (нет подключения / disconnected / нет
 *           календаря): задача неактуальна, закрыть как done.
 * - defer — нужно переподключение или refresh-токен временно недоступен:
 *           НЕ терять задачу — оставить pending и отложить; после переподключения
 *           resumePending поднимет её и недосинхроненное доедет.
 * - sync  — подключение активно, выгружаем.
 *
 * Раньше все неактивные состояния схлопывались в done, поэтому один auth-сбой
 * (статус → needs_reconnect) молча закрывал остаток пачки без выгрузки.
 */
export function syncTaskAction(
  status: ConnectionStatus | null | undefined,
  hasCalendarId: boolean,
  hasRefreshToken: boolean,
): SyncTaskAction {
  if (!status || status === 'disconnected' || !hasCalendarId) return 'skip'
  if (status !== 'connected' || !hasRefreshToken) return 'defer'
  return 'sync'
}

/** Нижняя граница окна бэкфилла: сегодня минус lookback-дни (ISO YYYY-MM-DD). */
export function backfillCutoff(todayIso: string, lookbackDays: number): string {
  return DateUtil.addDays(todayIso, -lookbackDays)
}

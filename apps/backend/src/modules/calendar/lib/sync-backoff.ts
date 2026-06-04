const BASE_MS = 30_000
const MAX_MS = 3_600_000

/** Экспоненциальный бэкофф: 30s, 60s, 120s, … с потолком в 1 час. */
export function nextRunAfter(attempts: number, from: Date = new Date()): Date {
  const delay = Math.min(BASE_MS * 2 ** Math.max(0, attempts - 1), MAX_MS)
  return new Date(from.getTime() + delay)
}

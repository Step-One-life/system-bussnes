/**
 * N дат с недельным шагом от стартовой (ISO YYYY-MM-DD), включая старт.
 * Считаем на UTC, чтобы шаг в 7 дней не «плыл» из-за часового пояса/перехода
 * на летнее время. count < 1 трактуется как 1.
 */
export function weeklySeriesDates(startISO: string, count: number): string[] {
  const n = Math.max(1, Math.floor(count))
  const base = new Date(`${startISO}T00:00:00Z`)
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() + 7 * i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

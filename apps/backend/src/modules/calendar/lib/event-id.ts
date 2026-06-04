/**
 * Детерминированный id события Google из id тренировки.
 * UUID без дефисов в нижнем регистре = 32 hex-символа — валидный id Google
 * Calendar (допускаются a–v и 0–9, длина 5–1024). Делает upsert/delete
 * идемпотентными без хранения id в БД.
 */
export function eventIdFor(trainingId: string): string {
  return trainingId.replace(/-/g, '').toLowerCase()
}

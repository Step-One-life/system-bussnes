/** Ключ галочки индивидуальной строки: у парного занятия один trainingId на двоих. */
export const indKey = (trainingId: string, studentId: string) => `${trainingId}:${studentId}`

interface HasId {
  id: string
}

interface GroupSlotLike {
  existing: { attendees: string[] } | null
}

/**
 * Дефолт галочек группового занятия: уже отмеченное — фактические отметки;
 * неотмеченное — «все пришли» (весь состав, кроме тех, кого гейт не пускает).
 */
export function defaultGroupChecks<S extends HasId>(
  slot: GroupSlotLike,
  members: S[],
  canMark: (s: S) => boolean,
): Set<string> {
  const marked = slot.existing?.attendees ?? []
  if (marked.length > 0) return new Set(marked)
  return new Set(members.filter(canMark).map((s) => s.id))
}

export interface IndSlotLike {
  trainingId: string
  studentId: string
  originalPresent: boolean
}

/** Дефолт индивидуальных строк: отмеченный — как есть, плановый — пришёл (если не гейтнут). */
export function defaultIndChecks(
  slots: IndSlotLike[],
  canMark: (slot: IndSlotLike) => boolean,
): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const s of slots) {
    out[indKey(s.trainingId, s.studentId)] = s.originalPresent || canMark(s)
  }
  return out
}

export interface CloseDayRowCount {
  key: string
  alreadyMarked: boolean
  /** Сколько человек отметится галочкой «прошло как запланировано». */
  willMark: number
}

/** Итог для кнопки «Отметить всё · N занятий, K человек». */
export function closeDaySummary(
  rows: CloseDayRowCount[],
  checkedKeys: Set<string>,
): { trainings: number; students: number } {
  let trainings = 0
  let students = 0
  for (const r of rows) {
    if (r.alreadyMarked || !checkedKeys.has(r.key) || r.willMark === 0) continue
    trainings += 1
    students += r.willMark
  }
  return { trainings, students }
}

import map from 'lodash/map'

import { apiClient } from 'common/services/api/api-client'
import { getGroupMaps } from 'common/services/api/group-map'
import { todayISO } from 'common/utils/date'
import { getStudentById, updateStudent } from 'entities/students/model/students.repo'

import { trainingsWindow } from './training-window'

import type { Training, TrainingInput } from './types'

/** Raw training shape from the backend — groupId is a UUID, attendees are objects. */
interface RawTraining {
  id: string
  date: string
  time: string
  groupId: string
  locationId?: string | null
  attendees?: { id: string }[]
  note: string
  isPrime: boolean
  isOnline?: boolean
  sessionDuration: number
  recurring: boolean
  recurringId: string | null
  plannedStudentId?: string | null
  isPair?: boolean
  plannedStudentId2?: string | null
  createdAt: string
}

/** Normalise a backend training: groupId UUID → name, attendees → id list. */
function toTraining(raw: RawTraining, byId: Map<string, string>): Training {
  return {
    id: raw.id,
    date: raw.date,
    time: raw.time ?? '',
    groupId: byId.get(raw.groupId) ?? raw.groupId,
    locationId: raw.locationId ?? null,
    attendees: map(raw.attendees ?? [], (a) => a.id),
    note: raw.note ?? '',
    isPrime: raw.isPrime ?? false,
    isOnline: raw.isOnline ?? false,
    sessionDuration: raw.sessionDuration ?? 60,
    recurring: raw.recurring ?? false,
    recurringId: raw.recurringId ?? null,
    plannedStudentId: raw.plannedStudentId ?? null,
    isPair: raw.isPair ?? false,
    plannedStudentId2: raw.plannedStudentId2 ?? null,
    createdAt: raw.createdAt,
  }
}

function sortByDateDesc(trainings: Training[]): Training[] {
  return [...trainings].sort((a, b) => {
    const da = new Date(a.date + 'T' + (a.time || '00:00'))
    const db = new Date(b.date + 'T' + (b.time || '00:00'))
    return db.getTime() - da.getTime()
  })
}

export async function getTrainings(): Promise<Training[]> {
  // Скользящее окно вместо всей истории — диапазон режет SQL на бэке.
  const { from, to } = trainingsWindow(todayISO())
  const [raw, maps] = await Promise.all([
    apiClient.get<RawTraining[]>(`/trainings?from=${from}&to=${to}`),
    getGroupMaps(),
  ])
  return sortByDateDesc(map(raw, (r) => toTraining(r, maps.byId)))
}

export async function getTrainingById(id: string): Promise<Training | null> {
  try {
    const [raw, maps] = await Promise.all([
      apiClient.get<RawTraining>(`/trainings/${id}`),
      getGroupMaps(),
    ])
    return toTraining(raw, maps.byId)
  } catch {
    return null
  }
}

export async function createTraining(data: TrainingInput): Promise<Training> {
  const { byName, byId } = await getGroupMaps()
  // The backend deducts a session and records a visit for every attendee
  // passed at creation time, so callers must NOT additionally invoke
  // `markAttendance` for the same students on a freshly created training.
  const raw = await apiClient.post<RawTraining>('/trainings', {
    date: data.date,
    time: data.time ?? '',
    groupId: byName.get(data.groupId) ?? data.groupId,
    locationId: data.locationId ?? null,
    attendees: data.attendees ?? [],
    note: data.note ?? '',
    isPrime: data.isPrime,
    isOnline: data.isOnline ?? false,
    sessionDuration: data.sessionDuration,
    recurring: data.recurring,
    recurringId: data.recurringId,
    plannedStudentId: data.plannedStudentId ?? null,
    isPair: data.isPair ?? false,
    plannedStudentId2: data.plannedStudentId2 ?? null,
    batchId: data.batchId,
  })
  return toTraining(raw, byId)
}

export async function updateTraining(
  id: string,
  changes: Partial<Training>,
): Promise<Training | null> {
  const { byName, byId } = await getGroupMaps()
  const body: Record<string, unknown> = {}
  if (changes.date !== undefined) body.date = changes.date
  if (changes.time !== undefined) body.time = changes.time
  if (changes.groupId !== undefined) body.groupId = byName.get(changes.groupId) ?? changes.groupId
  if (changes.locationId !== undefined) body.locationId = changes.locationId
  if (changes.note !== undefined) body.note = changes.note
  if (changes.isPrime !== undefined) body.isPrime = changes.isPrime
  if (changes.isOnline !== undefined) body.isOnline = changes.isOnline
  if (changes.sessionDuration !== undefined) body.sessionDuration = changes.sessionDuration
  if (changes.recurring !== undefined) body.recurring = changes.recurring
  if (changes.recurringId !== undefined) body.recurringId = changes.recurringId
  // `attendees` is intentionally ignored: the roster is managed via the
  // dedicated attendees endpoints (addAttendees / removeAttendee), which the
  // backend uses to deduct sessions and record visits atomically.
  const raw = await apiClient.patch<RawTraining>(`/trainings/${id}`, body)
  return toTraining(raw, byId)
}

export async function updateTrainingSeries(
  recurringId: string,
  changes: {
    time?: string
    locationId?: string | null
    note?: string
    isOnline?: boolean
    /** Перенос всей серии на N дней (другой день недели). 0 — дату не трогаем. */
    dateShiftDays?: number
  },
): Promise<number> {
  const body: Record<string, unknown> = {}
  if (changes.time !== undefined) body.time = changes.time
  if (changes.locationId !== undefined) body.locationId = changes.locationId
  if (changes.note !== undefined) body.note = changes.note
  if (changes.isOnline !== undefined) body.isOnline = changes.isOnline
  if (changes.dateShiftDays) body.dateShiftDays = changes.dateShiftDays
  const result = await apiClient.patch<{ updated: number }>(
    `/trainings/recurring/${recurringId}`,
    body,
  )
  return result?.updated ?? 0
}

export async function deleteTraining(id: string): Promise<boolean> {
  await apiClient.delete(`/trainings/${id}`)
  return true
}

export async function deleteRecurringSeries(recurringId: string | null): Promise<number> {
  if (!recurringId) return 0
  const result = await apiClient.delete<{ removed: number }>(
    `/trainings/recurring/${recurringId}`,
  )
  return result?.removed ?? 0
}

export async function getRecurringSeries(recurringId: string | null): Promise<Training[]> {
  if (!recurringId) return []
  const all = await getTrainings()
  return all.filter((t) => t.recurringId === recurringId)
}

/** Результат биллинга одного ученика при отметке (зеркало бэка). */
export interface BillingResult {
  studentId: string
  billing: 'subscription' | 'payment' | 'none'
  subStatus: 'ok' | 'ending' | 'expired' | 'none' | null
  remaining: number | null
}

/**
 * Add students to a training. The backend deducts a session per student OR
 * records an auto-payment, records visits, and reports billing per student.
 */
export async function addAttendees(
  trainingId: string,
  studentIds: string[],
  batchId?: string,
): Promise<{ training: Training | null; billing: BillingResult[] }> {
  if (!studentIds.length) {
    return { training: await getTrainingById(trainingId), billing: [] }
  }
  const { byId } = await getGroupMaps()
  const raw = await apiClient.post<{ training: RawTraining; billing: BillingResult[] }>(
    `/trainings/${trainingId}/attendees`,
    { studentIds, batchId },
  )
  return { training: toTraining(raw.training, byId), billing: raw.billing ?? [] }
}

/** Remove a single student from a training (restores their session server-side). */
export async function removeAttendee(
  trainingId: string,
  studentId: string,
): Promise<Training | null> {
  const { byId } = await getGroupMaps()
  const raw = await apiClient.delete<RawTraining>(
    `/trainings/${trainingId}/attendees/${studentId}`,
  )
  return raw ? toTraining(raw, byId) : null
}

/**
 * Remove a visit by its index in the student's history. Resolves the visit's
 * training and delegates to the backend attendee-removal endpoint, which
 * restores the session and deletes the visit.
 */
export async function removeVisitAt(studentId: string, index: number): Promise<void> {
  const student = await getStudentById(studentId)
  if (!student) return
  const visit = student.visitHistory[index]
  if (!visit) return

  if (visit.trainingId) {
    await removeAttendee(visit.trainingId, studentId)
    return
  }
  // Orphan visit with no training — drop it locally via a student update.
  const visitHistory = student.visitHistory.filter((_, i) => i !== index)
  await updateStudent(studentId, { visitHistory })
}

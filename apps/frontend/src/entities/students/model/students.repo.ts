import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'

import { apiClient } from 'common/services/api/api-client'
import { getGroupMaps } from 'common/services/api/group-map'

import type { DeductStatus, Student, StudentInput, Subscription, SubscriptionInput } from './types'

/**
 * Raw student shape returned by the backend. Groups are objects, visits live
 * under `visits`, and every `groupId` is a UUID — we normalise all of this to
 * the frontend domain model (group NAMES as identifiers).
 */
interface RawGroup {
  id: string
  name: string
}

interface RawSubscription extends Omit<Subscription, 'groupId' | 'groupIds'> {
  groupId: string
  groupIds?: string[] | null
}

interface RawVisit {
  date: string
  groupId: string
  trainingId: string | null
  billing?: 'subscription' | 'payment' | 'none' | null
}

interface RawStudent {
  id: string
  name: string
  phone?: string | null
  note?: string | null
  groups?: RawGroup[]
  subscriptions?: RawSubscription[]
  visits?: RawVisit[]
  createdAt: string
}

/** Convert a backend student into the frontend domain model. */
function toStudent(raw: RawStudent, byId: Map<string, string>): Student {
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone ?? null,
    note: raw.note ?? null,
    groups: map(raw.groups ?? [], (g) => g.name),
    subscriptions: map(raw.subscriptions ?? [], (s) => ({
      ...s,
      groupId: byId.get(s.groupId) ?? s.groupId,
      groupIds: (s.groupIds?.length ? s.groupIds : [s.groupId]).map(
        (id) => byId.get(id) ?? id,
      ),
    })),
    visitHistory: map(raw.visits ?? [], (v) => ({
      date: v.date,
      groupId: byId.get(v.groupId) ?? v.groupId,
      trainingId: v.trainingId ?? '',
      billing: v.billing ?? null,
    })),
    createdAt: raw.createdAt,
  }
}

/* ── Students ── */

export async function getStudents(): Promise<Student[]> {
  const [raw, maps] = await Promise.all([
    apiClient.get<RawStudent[]>('/students'),
    getGroupMaps(),
  ])
  return map(raw, (r) => toStudent(r, maps.byId))
}

export async function getStudentById(id: string): Promise<Student | null> {
  try {
    const [raw, maps] = await Promise.all([
      apiClient.get<RawStudent>(`/students/${id}`),
      getGroupMaps(),
    ])
    return toStudent(raw, maps.byId)
  } catch {
    return null
  }
}

export async function createStudent(data: StudentInput): Promise<Student> {
  const { byName, byId } = await getGroupMaps()
  const groupIds = map(data.groups ?? [], (name) => byName.get(name) ?? name)
  const raw = await apiClient.post<RawStudent>('/students', {
    name: data.name.trim(),
    groups: groupIds,
    phone: data.phone?.trim() || null,
    note: data.note?.trim() || null,
  })
  return toStudent(raw, byId)
}

export async function updateStudent(
  id: string,
  changes: Partial<Student>,
): Promise<Student | null> {
  const { byName, byId } = await getGroupMaps()
  const body: Record<string, unknown> = {}
  if (changes.name !== undefined) body.name = changes.name
  if (changes.phone !== undefined) body.phone = changes.phone?.trim() || null
  if (changes.note !== undefined) body.note = changes.note?.trim() || null
  if (changes.groups !== undefined) {
    body.groups = map(changes.groups, (name) => byName.get(name) ?? name)
  }
  const raw = await apiClient.patch<RawStudent>(`/students/${id}`, body)
  return toStudent(raw, byId)
}

export async function deleteStudent(id: string): Promise<boolean> {
  await apiClient.delete(`/students/${id}`)
  return true
}

/* ── Subscriptions ── */

export async function addSubscription(
  studentId: string,
  subData: SubscriptionInput,
): Promise<Subscription | null> {
  const { byName } = await getGroupMaps()
  const groupId = byName.get(subData.groupId) ?? subData.groupId
  const groupIds = subData.groupIds?.length
    ? subData.groupIds.map((name) => byName.get(name) ?? name)
    : undefined
  const raw = await apiClient.post<RawStudent>(`/students/${studentId}/subscriptions`, {
    groupId,
    type: subData.type,
    sessionsTotal: subData.sessionsTotal,
    isPair: subData.isPair,
    isUnlimited: subData.isUnlimited,
    createdAt: subData.createdAt,
    sessionDuration: subData.sessionDuration,
    validityDays: subData.validityDays,
    timeSlot: subData.timeSlot,
    groupIds,
    amount: subData.amount,
  })
  const student = toStudent(raw, (await getGroupMaps()).byId)
  // Только что созданный абонемент = самый свежий по дате среди абонементов этой
  // группы. Раньше брали forGroup.at(-1) (последний в массиве) — при нескольких
  // абонементах одной группы (особенно контейнер «Индивидуальные»: старый + новый)
  // порядок не гарантирован, и оплата продления привязывалась к СТАРОМУ абонементу.
  const forGroup = filterByGroup(student.subscriptions, subData.groupId)
  return (
    [...forGroup].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0] ?? null
  )
}

function filterByGroup(subs: Subscription[], groupName: string): Subscription[] {
  return subs.filter((s) => s.groupId === groupName)
}

/**
 * Списать занятие адресно с указанного абонемента. Выбор эвристикой по группе
 * здесь запрещён: при нескольких активных абонементах одной группы (штатно в
 * контейнере «Индивидуальные»: обычный + парный + онлайн) списание уходило не
 * с того абонемента, по которому нажали в карточке.
 */
export async function deductSessionById(
  studentId: string,
  subId: string,
): Promise<{ sub: Subscription | null; status: DeductStatus }> {
  const raw = await apiClient.post<RawStudent>(
    `/students/${studentId}/subscriptions/${subId}/deduct`,
  )
  const updated = toStudent(raw, (await getGroupMaps()).byId)
  const sub = find(updated.subscriptions, (s) => s.id === subId) ?? null

  let status: DeductStatus = 'ok'
  if (!sub) status = 'none'
  else if (!sub.isActive) status = 'expired'
  else if (sub.remaining <= 2) status = 'ending'

  return { sub, status }
}

export async function getActiveSubscription(
  studentId: string,
  groupId: string,
): Promise<Subscription | null> {
  const student = await getStudentById(studentId)
  if (!student) return null
  return find(student.subscriptions, (s) => s.groupId === groupId && s.isActive) ?? null
}

/** Продлить срок адресно указанного абонемента (см. deductSessionById). */
export async function extendSubscriptionById(
  studentId: string,
  subId: string,
  days: number,
): Promise<Subscription | null> {
  const raw = await apiClient.post<RawStudent>(
    `/students/${studentId}/subscriptions/${subId}/extend`,
    { days },
  )
  const updated = toStudent(raw, (await getGroupMaps()).byId)
  return find(updated.subscriptions, (s) => s.id === subId) ?? null
}

export async function deleteSubscription(studentId: string, subId: string): Promise<boolean> {
  await apiClient.delete(`/students/${studentId}/subscriptions/${subId}`)
  return true
}

/**
 * Редактировать абонемент адресно по subId: дата / количество / состав групп.
 * groupIds приходят ИМЕНАМИ групп (фронт работает с именами) и мапятся в UUID
 * через group-map — ровно как addSubscription. Шлём только реально изменённые поля.
 */
export async function editSubscription(
  studentId: string,
  subId: string,
  changes: { total?: number; expiresAt?: string; groupIds?: string[] },
): Promise<void> {
  const body: Record<string, unknown> = {}
  if (changes.total !== undefined) body.total = changes.total
  if (changes.expiresAt !== undefined) body.expiresAt = changes.expiresAt
  if (changes.groupIds !== undefined) {
    const { byName } = await getGroupMaps()
    body.groupIds = changes.groupIds.map((name) => byName.get(name) ?? name)
  }
  await apiClient.patch(`/students/${studentId}/subscriptions/${subId}`, body)
}

export async function linkPaymentToSub(
  studentId: string,
  subId: string,
  paymentId: string,
  opts?: { logAsPayment?: boolean; amount?: number },
): Promise<void> {
  // Marks the subscription as paid (sets finPaymentId) so the "Оплатить"
  // action disappears and the payment can't be recorded twice.
  // logAsPayment просит бэк записать событие журнала о ручной оплате (mark-paid);
  // авто-линковка при покупке абонемента флаг не ставит (платёж уже отражён в
  // событии subscription_created).
  await apiClient.post(`/students/${studentId}/subscriptions/${subId}/link-payment`, {
    paymentId,
    logAsPayment: opts?.logAsPayment,
    amount: opts?.amount,
  })
}

/* ── Visit history ── */

export function getLastVisitDate(student: Student): string | null {
  if (isEmpty(student.visitHistory)) return null
  return map(student.visitHistory, (v) => v.date).sort().at(-1) ?? null
}

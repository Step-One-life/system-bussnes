import map from 'lodash/map'

import { apiClient } from 'common/services/api/api-client'

import type {
  HallCost,
  HallCostInput,
  Payment,
  PaymentInput,
  Pricing,
  PricingRule,
  PricingRuleChanges,
  PricingRuleInput,
} from './types'

/**
 * The backend speaks camelCase, the frontend domain model is snake_case.
 * These mappers translate at the API boundary so finance components keep
 * working unchanged.
 */
interface RawPayment {
  id: string
  studentId: string | null
  clientPaymentType: Payment['client_payment_type']
  clientAmount: number | string
  sessionsTotal: number
  sessionsRemaining: number
  paidAt: string
  status: Payment['status']
  notes: string | null
  hallCostId: string | null
}

interface RawHallCost {
  id: string
  studentId: string | null
  hallPaymentType: HallCost['hall_payment_type']
  timeSlot: HallCost['time_slot']
  trainingTime: string
  hallAmount: number | string
  sessionsTotal: number
  sessionsRemaining: number
  paidAt: string
  status: HallCost['status']
  notes: string | null
}

function toPayment(raw: RawPayment): Payment {
  return {
    id: raw.id,
    student_id: raw.studentId,
    client_payment_type: raw.clientPaymentType,
    client_amount: Number(raw.clientAmount) || 0,
    sessions_total: raw.sessionsTotal,
    sessions_remaining: raw.sessionsRemaining,
    paid_at: raw.paidAt,
    status: raw.status,
    notes: raw.notes ?? '',
    hall_cost_id: raw.hallCostId,
  }
}

function toHallCost(raw: RawHallCost): HallCost {
  return {
    id: raw.id,
    student_id: raw.studentId,
    hall_payment_type: raw.hallPaymentType,
    time_slot: raw.timeSlot,
    training_time: raw.trainingTime ?? '',
    hall_amount: Number(raw.hallAmount) || 0,
    sessions_total: raw.sessionsTotal,
    sessions_remaining: raw.sessionsRemaining,
    paid_at: raw.paidAt,
    status: raw.status,
    notes: raw.notes ?? '',
  }
}

function sortByPaidDesc<T extends { paid_at: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime(),
  )
}

/* ── Pricing ── */

export async function getPricing(): Promise<Pricing> {
  const data = await apiClient.get<Record<string, number>>('/finance/pricing')
  return { ...data } as Pricing
}

export async function savePricing(data: Pricing): Promise<void> {
  const { updated_at, ...values } = data
  void updated_at
  await apiClient.put('/finance/pricing', { data: values })
}

/* ── Pricing rules (per-location tariffs) ── */

interface RawPricingRule {
  id: string
  locationId: string
  title: string
  lessonKind: PricingRule['lesson_kind']
  format: PricingRule['format']
  durationMinutes: number
  sessionsCount: number
  clientPrice: number | string
  clientPrimePrice: number | string
  hallCost: number | string
  hallPrimeCost: number | string
  active: boolean
  createdAt: string
}

function toPricingRule(raw: RawPricingRule): PricingRule {
  return {
    id: raw.id,
    location_id: raw.locationId,
    title: raw.title,
    lesson_kind: raw.lessonKind,
    format: raw.format,
    duration_minutes: raw.durationMinutes,
    sessions_count: raw.sessionsCount,
    client_price: Number(raw.clientPrice) || 0,
    client_prime_price: Number(raw.clientPrimePrice) || 0,
    hall_cost: Number(raw.hallCost) || 0,
    hall_prime_cost: Number(raw.hallPrimeCost) || 0,
    active: !!raw.active,
    created_at: raw.createdAt,
  }
}

export async function getPricingRules(locationId: string): Promise<PricingRule[]> {
  if (!locationId) return []
  const raw = await apiClient.get<RawPricingRule[]>('/finance/pricing-rules', {
    locationId,
  })
  return map(raw, toPricingRule)
}

export async function createPricingRule(data: PricingRuleInput): Promise<PricingRule> {
  const raw = await apiClient.post<RawPricingRule>('/finance/pricing-rules', {
    locationId: data.location_id,
    title: data.title,
    lessonKind: data.lesson_kind,
    format: data.format,
    durationMinutes: data.duration_minutes,
    sessionsCount: data.sessions_count,
    clientPrice: data.client_price ?? 0,
    clientPrimePrice: data.client_prime_price ?? 0,
    hallCost: data.hall_cost ?? 0,
    hallPrimeCost: data.hall_prime_cost ?? 0,
    active: data.active ?? true,
  })
  return toPricingRule(raw)
}

export async function updatePricingRule(
  id: string,
  changes: PricingRuleChanges,
): Promise<PricingRule | null> {
  const body: Record<string, unknown> = {}
  if (changes.title !== undefined) body.title = changes.title
  if (changes.lesson_kind !== undefined) body.lessonKind = changes.lesson_kind
  if (changes.format !== undefined) body.format = changes.format
  if (changes.duration_minutes !== undefined) body.durationMinutes = changes.duration_minutes
  if (changes.sessions_count !== undefined) body.sessionsCount = changes.sessions_count
  if (changes.client_price !== undefined) body.clientPrice = changes.client_price
  if (changes.client_prime_price !== undefined) {
    body.clientPrimePrice = changes.client_prime_price
  }
  if (changes.hall_cost !== undefined) body.hallCost = changes.hall_cost
  if (changes.hall_prime_cost !== undefined) body.hallPrimeCost = changes.hall_prime_cost
  if (changes.active !== undefined) body.active = changes.active
  const raw = await apiClient.patch<RawPricingRule>(`/finance/pricing-rules/${id}`, body)
  return toPricingRule(raw)
}

export async function deletePricingRule(id: string): Promise<boolean> {
  await apiClient.delete(`/finance/pricing-rules/${id}`)
  return true
}

export async function copyPricingRules(
  fromLocationId: string,
  toLocationId: string,
): Promise<void> {
  await apiClient.post('/finance/pricing-rules/copy', { fromLocationId, toLocationId })
}

/* ── Payments (client → coach) ── */

export async function getPayments(): Promise<Payment[]> {
  const raw = await apiClient.get<RawPayment[]>('/finance/payments')
  return sortByPaidDesc(raw.map(toPayment))
}

export async function createPayment(data: PaymentInput): Promise<Payment> {
  const raw = await apiClient.post<RawPayment>('/finance/payments', {
    studentId: data.student_id ?? null,
    clientPaymentType: data.client_payment_type,
    clientAmount: parseFloat(String(data.client_amount)) || 0,
    paidAt: data.paid_at,
    notes: data.notes,
    hallCostId: data.hall_cost_id ?? null,
  })
  return toPayment(raw)
}

export async function updatePayment(
  id: string,
  changes: Partial<Payment>,
): Promise<Payment | null> {
  const body: Record<string, unknown> = {}
  if (changes.student_id !== undefined) body.studentId = changes.student_id
  if (changes.client_payment_type !== undefined) {
    body.clientPaymentType = changes.client_payment_type
  }
  if (changes.client_amount !== undefined) {
    body.clientAmount = parseFloat(String(changes.client_amount)) || 0
  }
  if (changes.paid_at !== undefined) body.paidAt = changes.paid_at
  if (changes.notes !== undefined) body.notes = changes.notes
  if (changes.hall_cost_id !== undefined) body.hallCostId = changes.hall_cost_id
  const raw = await apiClient.patch<RawPayment>(`/finance/payments/${id}`, body)
  return toPayment(raw)
}

export async function deletePayment(id: string): Promise<boolean> {
  await apiClient.delete(`/finance/payments/${id}`)
  return true
}

/* ── Hall costs (coach → hall) ── */

export async function getHallCosts(): Promise<HallCost[]> {
  const raw = await apiClient.get<RawHallCost[]>('/finance/hall-costs')
  return sortByPaidDesc(raw.map(toHallCost))
}

export async function createHallCost(data: HallCostInput): Promise<HallCost> {
  const raw = await apiClient.post<RawHallCost>('/finance/hall-costs', {
    studentId: data.student_id ?? null,
    hallPaymentType: data.hall_payment_type,
    timeSlot: data.time_slot,
    trainingTime: data.training_time,
    hallAmount: parseFloat(String(data.hall_amount)) || 0,
    paidAt: data.paid_at,
    notes: data.notes,
  })
  return toHallCost(raw)
}

export async function updateHallCost(
  id: string,
  changes: Partial<HallCost>,
): Promise<HallCost | null> {
  const body: Record<string, unknown> = {}
  if (changes.student_id !== undefined) body.studentId = changes.student_id
  if (changes.hall_payment_type !== undefined) body.hallPaymentType = changes.hall_payment_type
  if (changes.time_slot !== undefined) body.timeSlot = changes.time_slot
  if (changes.training_time !== undefined) body.trainingTime = changes.training_time
  if (changes.hall_amount !== undefined) {
    body.hallAmount = parseFloat(String(changes.hall_amount)) || 0
  }
  if (changes.paid_at !== undefined) body.paidAt = changes.paid_at
  if (changes.notes !== undefined) body.notes = changes.notes
  const raw = await apiClient.patch<RawHallCost>(`/finance/hall-costs/${id}`, body)
  return toHallCost(raw)
}

export async function deleteHallCost(id: string): Promise<boolean> {
  await apiClient.delete(`/finance/hall-costs/${id}`)
  return true
}

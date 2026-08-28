/**
 * Денежные перечисления — РЕ-ЭКСПОРТ из @trikick/shared, а не копия.
 * Раньше здесь лежал дословный дубль, и добавление вида занятия требовало
 * правки в двух местах: расхождение уже ломало прайм-цены (см. ARCHITECTURE §8).
 */
import type {
  ClientPaymentType,
  FinStatus,
  HallPaymentType,
  TimeSlot,
} from '@trikick/shared'

export type { ClientPaymentType, FinStatus, HallPaymentType, TimeSlot }

export interface Payment {
  id: string
  student_id: string | null
  location_id: string | null
  /** UUID привязанной группы (доход с группы). Альтернатива student_id. */
  group_id: string | null
  client_payment_type: ClientPaymentType
  client_amount: number
  sessions_total: number
  sessions_remaining: number
  paid_at: string
  status: FinStatus
  notes: string
  hall_cost_id: string | null
}

export interface PaymentInput {
  student_id?: string | null
  location_id?: string | null
  /** ИМЯ группы — finance.repo резолвит в UUID перед запросом (group-map). */
  group_id?: string | null
  client_payment_type: ClientPaymentType
  client_amount: number | string
  /** Число занятий платежа (обобщённый абонемент). Иначе — по типу на бэке. */
  sessions_total?: number
  paid_at?: string
  notes?: string
  hall_cost_id?: string | null
  /** Записать событие журнала о ручной оплате (только «Добавить оплату»). */
  log_as_payment?: boolean
}

export interface HallCost {
  id: string
  student_id: string | null
  location_id: string | null
  hall_payment_type: HallPaymentType
  time_slot: TimeSlot
  training_time: string
  hall_amount: number
  sessions_total: number
  sessions_remaining: number
  paid_at: string
  status: FinStatus
  notes: string
}

export interface HallCostInput {
  student_id?: string | null
  location_id?: string | null
  hall_payment_type: HallPaymentType
  time_slot?: TimeSlot
  training_time?: string
  hall_amount: number | string
  /** Число занятий расхода (обобщённый абонемент). Иначе — по типу на бэке. */
  sessions_total?: number
  paid_at?: string
  notes?: string
}

export type LessonKind = 'individual' | 'group' | 'online' | 'shared' | 'pair'

export type PricingFormat = 'single' | 'subscription' | 'unlimited'

/** Тариф локации: одна строка прайс-листа. */
export interface PricingRule {
  id: string
  location_id: string
  title: string
  lesson_kind: LessonKind
  format: PricingFormat
  duration_minutes: number
  sessions_count: number
  client_price: number
  client_prime_price: number
  hall_cost: number
  hall_prime_cost: number
  active: boolean
  validity_days: number
  created_at: string
}

export interface PricingRuleInput {
  location_id: string
  title: string
  lesson_kind: LessonKind
  format: PricingFormat
  duration_minutes: number
  sessions_count: number
  client_price?: number
  client_prime_price?: number
  hall_cost?: number
  hall_prime_cost?: number
  active?: boolean
  validity_days?: number
}

export interface PricingRuleChanges {
  title?: string
  lesson_kind?: LessonKind
  format?: PricingFormat
  duration_minutes?: number
  sessions_count?: number
  client_price?: number
  client_prime_price?: number
  hall_cost?: number
  hall_prime_cost?: number
  active?: boolean
  validity_days?: number
}

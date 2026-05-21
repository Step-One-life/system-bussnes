export type ClientPaymentType =
  | 'single_individual'
  | 'single_group'
  | 'individual_sub_4'
  | 'group_sub_4'
  | 'individual_sub_8'
  | 'group_sub_8'
  | 'single_individual_90'
  | 'individual_sub_4_90'
  | 'individual_sub_8_90'

export type HallPaymentType = ClientPaymentType

export type TimeSlot = 'regular' | 'prime'

export type FinStatus = 'active' | 'closed'

export interface Payment {
  id: string
  student_id: string | null
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
  client_payment_type: ClientPaymentType
  client_amount: number | string
  paid_at?: string
  notes?: string
  hall_cost_id?: string | null
}

export interface HallCost {
  id: string
  student_id: string | null
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
  hall_payment_type: HallPaymentType
  time_slot?: TimeSlot
  training_time?: string
  hall_amount: number | string
  paid_at?: string
  notes?: string
}

export type Pricing = Record<string, number> & { updated_at?: string }

export type LessonKind = 'individual' | 'group'

export type PricingFormat = 'single' | 'subscription'

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
}

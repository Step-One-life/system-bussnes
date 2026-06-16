import type {
  ClientPaymentType,
  FinStatus,
  HallPaymentType,
  LessonKind,
  PricingFormat,
  TimeSlot,
} from '../enums'

export interface Payment {
  id: string
  studentId: string | null
  groupId: string | null
  clientPaymentType: ClientPaymentType
  clientAmount: number
  sessionsTotal: number
  sessionsRemaining: number
  paidAt: string
  status: FinStatus
  notes: string
  hallCostId: string | null
}

export interface HallCost {
  id: string
  studentId: string | null
  hallPaymentType: HallPaymentType
  timeSlot: TimeSlot
  trainingTime: string
  hallAmount: number
  sessionsTotal: number
  sessionsRemaining: number
  paidAt: string
  status: FinStatus
  notes: string
}

export type Pricing = Record<string, number> & { updatedAt?: string }

/**
 * Тариф локации: одна строка прайс-листа. Заменяет плоский JSON-словарь
 * Pricing. Цена клиента и расход залу — обычные и prime.
 */
export interface PricingRule {
  id: string
  locationId: string
  title: string
  lessonKind: LessonKind
  format: PricingFormat
  durationMinutes: number
  sessionsCount: number
  clientPrice: number
  clientPrimePrice: number
  hallCost: number
  hallPrimeCost: number
  active: boolean
  createdAt: string
}

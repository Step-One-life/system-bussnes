import type { ClientPaymentType, FinStatus, HallPaymentType, TimeSlot } from '../enums'

export interface Payment {
  id: string
  studentId: string | null
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

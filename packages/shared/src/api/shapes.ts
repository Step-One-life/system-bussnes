import type { ClientPaymentType, HallPaymentType, SubscriptionType, TimeSlot } from '../enums'
import type { ScheduleEntry } from '../domain/group'

/** Request payload contracts. Backend DTOs implement these. */

export interface RegisterShape {
  name: string
  email: string
  password: string
}

export interface LoginShape {
  email: string
  password: string
}

export interface CreateGroupShape {
  name: string
  schedule?: ScheduleEntry[]
  duration?: number
  isIndividual?: boolean
}

export type UpdateGroupShape = Partial<Omit<CreateGroupShape, 'name'>>

export interface CreateStudentShape {
  name: string
  groups?: string[]
}

export type UpdateStudentShape = Partial<CreateStudentShape>

export interface CreateSubscriptionShape {
  groupId: string
  type: SubscriptionType
  createdAt?: string
  sessionDuration?: number
}

export interface CreateTrainingShape {
  date: string
  time?: string
  groupId: string
  attendees?: string[]
  note?: string
  isPrime?: boolean
  sessionDuration?: number
  recurring?: boolean
  recurringId?: string | null
}

export type UpdateTrainingShape = Partial<CreateTrainingShape>

export interface CreatePaymentShape {
  studentId?: string | null
  clientPaymentType: ClientPaymentType
  clientAmount: number
  paidAt?: string
  notes?: string
  hallCostId?: string | null
}

export type UpdatePaymentShape = Partial<CreatePaymentShape>

export interface CreateHallCostShape {
  studentId?: string | null
  hallPaymentType: HallPaymentType
  timeSlot?: TimeSlot
  trainingTime?: string
  hallAmount: number
  paidAt?: string
  notes?: string
}

export type UpdateHallCostShape = Partial<CreateHallCostShape>

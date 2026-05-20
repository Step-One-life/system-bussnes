import type { SubscriptionType, SubStatusType } from '../enums'

export interface Subscription {
  id: string
  groupId: string
  type: SubscriptionType
  total: number
  remaining: number
  createdAt: string
  expiresAt: string
  isActive: boolean
  finPaymentId: string | null
  sessionDuration: number
}

export interface VisitRecord {
  date: string
  groupId: string
  trainingId: string
}

export interface Student {
  id: string
  name: string
  groups: string[]
  subscriptions: Subscription[]
  visitHistory: VisitRecord[]
  createdAt: string
}

export interface SubStatus {
  label: string
  type: SubStatusType
}

export type SubscriptionType = '1' | '4' | '8' | '1_90' | '4_90' | '8_90'

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

export interface StudentInput {
  name: string
  groups?: string[]
  subscriptions?: Subscription[]
}

export interface SubscriptionInput {
  groupId: string
  type: SubscriptionType
  createdAt?: string
  sessionDuration?: number
}

export type SubStatusType = 'active' | 'ending' | 'danger' | 'expired' | 'none'

export interface SubStatus {
  label: string
  type: SubStatusType
}

export type DeductStatus = 'ok' | 'ending' | 'expired' | 'none'

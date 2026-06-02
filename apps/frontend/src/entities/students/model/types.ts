export type SubscriptionType = '1' | '4' | '8' | '1_90' | '4_90' | '8_90'

export type TimeSlot = 'regular' | 'prime'

export interface Subscription {
  id: string
  groupId: string
  /** Все группы (имена), которые покрывает абонемент. Общий — несколько. */
  groupIds: string[]
  type: SubscriptionType
  total: number
  remaining: number
  createdAt: string
  expiresAt: string
  isActive: boolean
  finPaymentId: string | null
  sessionDuration: number
  /** Слот тарифа, выбранный при продаже (прайм/обычный). */
  timeSlot: TimeSlot
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
  validityDays?: number
  timeSlot?: TimeSlot
  /** Общий абонемент: покрываемые группы (имена). Пусто = только groupId. */
  groupIds?: string[]
}

export type SubStatusType = 'active' | 'ending' | 'danger' | 'expired' | 'none'

export interface SubStatus {
  label: string
  type: SubStatusType
}

export type DeductStatus = 'ok' | 'ending' | 'expired' | 'none'

export type SubscriptionType = '1' | '4' | '8' | '1_90' | '4_90' | '8_90' | 'sub'

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
  /** Парный абонемент: списывается только парными тренировками. */
  isPair: boolean
  /** Безлимит: действует по сроку, число занятий не списывается. */
  isUnlimited: boolean
}

/** Как списано посещение: абонемент, разовый платёж или без оплаты. */
export type VisitBilling = 'subscription' | 'payment' | 'none'

export interface VisitRecord {
  date: string
  groupId: string
  trainingId: string
  /** null у старых визитов, созданных до появления биллинга. */
  billing: VisitBilling | null
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
  /** Число занятий (из выбранного тарифа). Авторитетно; иначе — по типу (легаси). */
  sessionsTotal?: number
  /** Парный абонемент. */
  isPair?: boolean
  /** Безлимит (по сроку, без списания числа). */
  isUnlimited?: boolean
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

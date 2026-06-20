import type {
  ClientPaymentType,
  HallPaymentType,
  LessonKind,
  LocationKind,
  PricingFormat,
  SubscriptionType,
  TimeSlot,
} from '../enums'
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
  locationId?: string | null
  expiresAt?: string | null
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
  /** Число занятий (из выбранного тарифа). Авторитетно; иначе — по типу (легаси). */
  sessionsTotal?: number
  /** Парный абонемент: списывается только парными тренировками. */
  isPair?: boolean
  /** Безлимит: действует по сроку, при отметке не списывает занятия. */
  isUnlimited?: boolean
  createdAt?: string
  sessionDuration?: number
  validityDays?: number
  timeSlot?: TimeSlot
  /** Общий абонемент: все покрываемые группы (UUID). Пусто = только groupId. */
  groupIds?: string[]
}

export interface CreateTrainingShape {
  date: string
  time?: string
  groupId: string
  locationId?: string | null
  attendees?: string[]
  note?: string
  isPrime?: boolean
  sessionDuration?: number
  recurring?: boolean
  recurringId?: string | null
  isOnline?: boolean
  plannedStudentId?: string | null
  isPair?: boolean
  plannedStudentId2?: string | null
}

export type UpdateTrainingShape = Partial<CreateTrainingShape>

export interface CreatePaymentShape {
  studentId?: string | null
  locationId?: string | null
  /** Привязка дохода к группе (UUID). Альтернатива studentId. */
  groupId?: string | null
  clientPaymentType: ClientPaymentType
  clientAmount: number
  /** Число занятий, покрываемых платежом. Нужно для обобщённого абонемента
   * (тип без фикс-числа в FIN_SESSIONS). Иначе — по типу платежа. */
  sessionsTotal?: number
  paidAt?: string
  notes?: string
  hallCostId?: string | null
}

export type UpdatePaymentShape = Partial<CreatePaymentShape>

export interface CreateHallCostShape {
  studentId?: string | null
  locationId?: string | null
  hallPaymentType: HallPaymentType
  timeSlot?: TimeSlot
  trainingTime?: string
  hallAmount: number
  /** Число занятий, покрываемых расходом. Для обобщённого абонемента — явно. */
  sessionsTotal?: number
  paidAt?: string
  notes?: string
}

export type UpdateHallCostShape = Partial<CreateHallCostShape>

/* ── Locations ── */

export interface CreateLocationShape {
  name: string
  address?: string | null
  kind?: LocationKind
  isDefault?: boolean
  primeWeekdayStart?: string | null
  primeWeekdayEnd?: string | null
  primeWeekendStart?: string | null
  primeWeekendEnd?: string | null
}

export type UpdateLocationShape = Partial<CreateLocationShape> & {
  archived?: boolean
}

/* ── Pricing rules ── */

export interface CreatePricingRuleShape {
  locationId: string
  title: string
  lessonKind: LessonKind
  format: PricingFormat
  durationMinutes: number
  sessionsCount: number
  clientPrice?: number
  clientPrimePrice?: number
  hallCost?: number
  hallPrimeCost?: number
  active?: boolean
  validityDays?: number
}

export type UpdatePricingRuleShape = Partial<Omit<CreatePricingRuleShape, 'locationId'>>

/** Копирование всех тарифов из одной локации в другую. */
export interface CopyPricingShape {
  fromLocationId: string
  toLocationId: string
}

/* ── Activity log (журнал действий) ── */

export type ActivityType =
  | 'attendance_marked'
  | 'subscription_created'
  | 'payment_recorded'
  | 'training_created'
  | 'training_deleted'

/** Денормализованные поля для отображения строки журнала (имена/суммы на момент события). */
export interface ActivitySummary {
  studentName?: string
  groupName?: string
  trainingTime?: string
  trainingDate?: string
  /** Чем оплачена отметка. */
  billing?: 'subscription' | 'payment' | 'none'
  /** Остаток занятий на абонементе после списания. */
  remaining?: number
  /** Число занятий в созданном абонементе. */
  sessionsCount?: number
  /** Денежная сумма (платёж/оплата). */
  amount?: number
}

export interface ActivityLogEntryShape {
  id: string
  type: ActivityType
  batchId: string | null
  createdAt: string
  undoneAt: string | null
  trainingId: string | null
  studentId: string | null
  subscriptionId: string | null
  paymentId: string | null
  summary: ActivitySummary
}

export interface ActivityLogPageShape {
  data: ActivityLogEntryShape[]
  nextCursor: string | null
}

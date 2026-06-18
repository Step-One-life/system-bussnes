/**
 * Тип абонемента. Пресеты 1/4/8 (+90-мин варианты) — легаси с фикс-числом занятий
 * (`SUB_TYPE_TOTALS`). `'sub'` — обобщённый абонемент из тарифа: число занятий
 * произвольное и хранится в `Subscription.total`, а не выводится из типа.
 */
export type SubscriptionType = '1' | '4' | '8' | '1_90' | '4_90' | '8_90' | 'sub'

export type SubStatusType = 'active' | 'ending' | 'danger' | 'expired' | 'none'

export type DeductStatus = 'ok' | 'ending' | 'expired' | 'none'

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
  | 'single_pair'
  | 'single_pair_90'
  // Обобщённый доход за абонемент с произвольным числом занятий (число — в
  // payment.sessionsTotal). Используется при выдаче кастомного абонемента.
  | 'group_subscription'
  | 'individual_subscription'
  | 'pair_subscription'
  | 'unlimited_subscription'

export type HallPaymentType = ClientPaymentType

export type TimeSlot = 'regular' | 'prime'

export type FinStatus = 'active' | 'closed'

/** Тип локации, где проходят занятия. */
export type LocationKind = 'hall' | 'studio' | 'outdoor' | 'online'

/** Вид занятия в тарифе. */
export type LessonKind = 'individual' | 'group' | 'online' | 'shared' | 'pair'

/** Формат тарифа: разовое занятие, абонемент (по числу) или безлимит (по сроку). */
export type PricingFormat = 'single' | 'subscription' | 'unlimited'

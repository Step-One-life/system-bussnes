export type SubscriptionType = '1' | '4' | '8' | '1_90' | '4_90' | '8_90'

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

export type HallPaymentType = ClientPaymentType

export type TimeSlot = 'regular' | 'prime'

export type FinStatus = 'active' | 'closed'

/** Тип локации, где проходят занятия. */
export type LocationKind = 'hall' | 'studio' | 'outdoor' | 'online'

/** Вид занятия в тарифе. */
export type LessonKind = 'individual' | 'group' | 'online' | 'shared'

/** Формат тарифа: разовое занятие или абонемент. */
export type PricingFormat = 'single' | 'subscription'

import { finLabel } from '../model/finance-constants'

import type { ClientPaymentType, HallPaymentType } from '../model/types'

const PAYMENT_TYPES = [
  'single_individual',
  'single_group',
  'individual_sub_4',
  'individual_sub_8',
  'single_individual_90',
  'individual_sub_4_90',
  'individual_sub_8_90',
  'group_sub_4',
  'group_sub_8',
  'single_pair',
  'single_pair_90',
] as const

// Функции, а не константы: метки берутся из текущего языка i18n при рендере.
export function clientTypeOptions(): { value: ClientPaymentType; label: string }[] {
  return PAYMENT_TYPES.map((value) => ({ value, label: finLabel(value) }))
}

export function hallTypeOptions(): { value: HallPaymentType; label: string }[] {
  return PAYMENT_TYPES.map((value) => ({ value, label: finLabel(value) }))
}

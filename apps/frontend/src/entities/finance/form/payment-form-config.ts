import type { ClientPaymentType, HallPaymentType } from '../model/types'

export const CLIENT_TYPE_OPTIONS: { value: ClientPaymentType; label: string }[] = [
  { value: 'single_individual', label: 'Разовая Индив.' },
  { value: 'single_group', label: 'Разовая групповая' },
  { value: 'individual_sub_4', label: 'Индив. ×4' },
  { value: 'individual_sub_8', label: 'Индив. ×8' },
  { value: 'single_individual_90', label: 'Индив. 1.5ч' },
  { value: 'individual_sub_4_90', label: 'Индив. 1.5ч ×4' },
  { value: 'individual_sub_8_90', label: 'Индив. 1.5ч ×8' },
  { value: 'group_sub_4', label: 'Групп. ×4' },
  { value: 'group_sub_8', label: 'Групп. ×8' },
  { value: 'single_pair', label: 'Парная разовая' },
  { value: 'single_pair_90', label: 'Парная 1.5ч' },
]

export const HALL_TYPE_OPTIONS: { value: HallPaymentType; label: string }[] = [
  { value: 'single_individual', label: 'Разовая Индив.' },
  { value: 'single_group', label: 'Разовая групповая' },
  { value: 'individual_sub_4', label: 'Индив. ×4' },
  { value: 'individual_sub_8', label: 'Индив. ×8' },
  { value: 'group_sub_4', label: 'Групп. ×4' },
  { value: 'group_sub_8', label: 'Групп. ×8' },
  { value: 'single_pair', label: 'Парная разовая' },
  { value: 'single_pair_90', label: 'Парная 1.5ч' },
]

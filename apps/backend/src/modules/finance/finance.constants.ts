import type { ClientPaymentType } from '@trikick/shared'

/** Payment type → number of sessions it covers. */
export const FIN_SESSIONS: Record<ClientPaymentType, number> = {
  single_individual: 1,
  single_group: 1,
  individual_sub_4: 4,
  group_sub_4: 4,
  individual_sub_8: 8,
  group_sub_8: 8,
  single_individual_90: 1,
  individual_sub_4_90: 4,
  individual_sub_8_90: 8,
  single_pair: 1,
  single_pair_90: 1,
}

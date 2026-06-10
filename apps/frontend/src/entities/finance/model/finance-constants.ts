import i18n from 'i18next'

// Finance payment type → session count.
export const FIN_SESSIONS: Record<string, number> = {
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

// Human-readable payment type label (translated via i18n).
export function finLabel(type: string): string {
  return i18n.t(`finance.types.${type}`, { defaultValue: type })
}

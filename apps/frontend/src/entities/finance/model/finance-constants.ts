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

// Human-readable payment type labels.
export const FIN_LABELS: Record<string, string> = {
  single_individual: 'Разовая Индив.',
  single_group: 'Разовая групп.',
  individual_sub_4: 'Индив. ×4',
  individual_sub_8: 'Индив. ×8',
  group_sub_4: 'Групп. ×4',
  group_sub_8: 'Групп. ×8',
  single_individual_90: 'Индив. 1.5ч',
  individual_sub_4_90: 'Индив. 1.5ч ×4',
  individual_sub_8_90: 'Индив. 1.5ч ×8',
  single_pair: 'Парная разовая',
  single_pair_90: 'Парная 1.5ч',
}

// Default pricing keys (all zero) used to seed the pricing form.
export const PRICING_DEFAULTS: Record<string, number> = {
  client_single_individual_price: 0,
  client_single_group_price: 0,
  client_individual_sub_4_price: 0,
  client_individual_sub_8_price: 0,
  client_group_sub_4_price: 0,
  client_group_sub_8_price: 0,
  client_single_individual_90_price: 0,
  client_individual_sub_4_90_price: 0,
  client_individual_sub_8_90_price: 0,
  hall_single_individual_regular_price: 0,
  hall_single_individual_prime_price: 0,
  hall_single_group_regular_price: 0,
  hall_single_group_prime_price: 0,
  hall_individual_sub_4_regular_price: 0,
  hall_individual_sub_4_prime_price: 0,
  hall_individual_sub_8_regular_price: 0,
  hall_individual_sub_8_prime_price: 0,
  hall_group_sub_4_regular_price: 0,
  hall_group_sub_4_prime_price: 0,
  hall_group_sub_8_regular_price: 0,
  hall_group_sub_8_prime_price: 0,
}

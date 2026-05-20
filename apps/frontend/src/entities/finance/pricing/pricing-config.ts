export interface PriceRowConfig {
  label: string
  key: string
  divisor?: number
}

export interface HallRowConfig {
  label: string
  keyBase: string
  divisor?: number
}

export interface PriceGroupConfig {
  subtitle: string
  rows: PriceRowConfig[]
}

export interface HallGroupConfig {
  subtitle: string
  rows: HallRowConfig[]
}

export const CLIENT_GROUPS: PriceGroupConfig[] = [
  {
    subtitle: 'Разовые занятия',
    rows: [
      { label: 'Разовая Индив. — 1 час', key: 'client_single_individual_price' },
      { label: 'Разовая групповая', key: 'client_single_group_price' },
    ],
  },
  {
    subtitle: 'Индив. абонементы — 1 час',
    rows: [
      { label: 'Абонемент 4 занятия', key: 'client_individual_sub_4_price', divisor: 4 },
      { label: 'Абонемент 8 занятий', key: 'client_individual_sub_8_price', divisor: 8 },
    ],
  },
  {
    subtitle: 'Индив. абонементы — 1.5 часа',
    rows: [
      { label: 'Разовое 1.5ч', key: 'client_single_individual_90_price' },
      { label: 'Абонемент 4 × 1.5ч', key: 'client_individual_sub_4_90_price', divisor: 4 },
      { label: 'Абонемент 8 × 1.5ч', key: 'client_individual_sub_8_90_price', divisor: 8 },
    ],
  },
  {
    subtitle: 'Групповые абонементы',
    rows: [
      { label: 'Групп. абонемент 4 занятия', key: 'client_group_sub_4_price', divisor: 4 },
      { label: 'Групп. абонемент 8 занятий', key: 'client_group_sub_8_price', divisor: 8 },
    ],
  },
]

export const HALL_GROUPS: HallGroupConfig[] = [
  {
    subtitle: 'Разовый вход',
    rows: [
      { label: 'Разовый вход — Индив.', keyBase: 'hall_single_individual' },
      { label: 'Разовый вход — групповой', keyBase: 'hall_single_group' },
    ],
  },
  {
    subtitle: 'Абонементы тренера (Индив.)',
    rows: [
      { label: 'Индив. абонемент 4 занятия', keyBase: 'hall_individual_sub_4', divisor: 4 },
      { label: 'Индив. абонемент 8 занятий', keyBase: 'hall_individual_sub_8', divisor: 8 },
    ],
  },
  {
    subtitle: 'Абонементы тренера (групповые)',
    rows: [
      { label: 'Групп. абонемент 4 занятия', keyBase: 'hall_group_sub_4', divisor: 4 },
      { label: 'Групп. абонемент 8 занятий', keyBase: 'hall_group_sub_8', divisor: 8 },
    ],
  },
]

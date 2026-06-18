import type { LessonKind, PricingFormat } from '../model/types'

/** Длительность занятия — пресеты в минутах. */
export const DURATION_PRESETS = [60, 90, 120]

/** Количество занятий в абонементе — пресеты. */
export const SESSIONS_PRESETS = [1, 4, 8]

export const LESSON_KINDS: LessonKind[] = ['individual', 'group', 'online', 'shared', 'pair']

export const PRICING_FORMATS: PricingFormat[] = ['single', 'subscription', 'unlimited']

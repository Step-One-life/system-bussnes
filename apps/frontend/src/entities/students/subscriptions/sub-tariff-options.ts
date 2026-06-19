import type { LessonKind, PricingRule } from 'entities/finance/model/types'

/**
 * Тарифы для дропдауна абонемента в модалке «Новый абонемент».
 * Одна группа — активные тарифы её вида (group/individual).
 * Несколько групп (общий абонемент) — тарифы вида 'shared' И обычные групповые:
 * тренер может взять отдельный «общий» тариф ИЛИ базироваться на тарифе группы.
 * Разовое сверху, дальше по возрастанию числа занятий; при равенстве «общий» ниже базового.
 */
export function subscriptionTariffOptions(
  rules: PricingRule[],
  opts: { isShared: boolean; lessonKind: LessonKind },
): PricingRule[] {
  const matched = rules.filter((r) => {
    if (!r.active) return false
    return opts.isShared
      ? r.lesson_kind === 'shared' || r.lesson_kind === 'group'
      : r.lesson_kind === opts.lessonKind
  })
  return [...matched].sort((a, b) => {
    if (a.format !== b.format) return a.format === 'single' ? -1 : 1
    if (a.sessions_count !== b.sessions_count) return a.sessions_count - b.sessions_count
    if (a.lesson_kind !== b.lesson_kind) return a.lesson_kind === 'shared' ? 1 : -1
    return 0
  })
}

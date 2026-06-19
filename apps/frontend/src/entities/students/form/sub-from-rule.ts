import type { SubscriptionInput, SubscriptionType } from '../model/types'
import type { LessonKind, PricingRule } from 'entities/finance/model/types'

/**
 * Активные тарифы нужного вида занятия: разовое сверху, затем абонементы
 * по возрастанию числа занятий. Источник вариантов абонемента в форме ученика.
 */
export function tariffOptions(rules: PricingRule[], lessonKind: LessonKind): PricingRule[] {
  return rules
    .filter((r) => r.active && r.lesson_kind === lessonKind)
    .sort((a, b) =>
      a.format !== b.format ? (a.format === 'single' ? -1 : 1) : a.sessions_count - b.sessions_count,
    )
}

/**
 * Параметры абонемента из выбранного тарифа. Создаём только абонемент (без дохода):
 * разовое → тип «1», прочее → «sub» с числом занятий из тарифа; безлимит — без числа.
 */
export function subFromRule(
  rule: PricingRule,
): Pick<
  SubscriptionInput,
  'type' | 'sessionsTotal' | 'isUnlimited' | 'sessionDuration' | 'validityDays'
> {
  const isUnlimited = rule.format === 'unlimited'
  const type: SubscriptionType = rule.format === 'single' ? '1' : 'sub'
  return {
    type,
    isUnlimited,
    sessionsTotal: isUnlimited ? undefined : rule.sessions_count,
    sessionDuration: rule.duration_minutes,
    validityDays: rule.validity_days,
  }
}

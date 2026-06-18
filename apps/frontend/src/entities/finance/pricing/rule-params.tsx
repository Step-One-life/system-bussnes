import join from 'lodash/join'

import { useTranslation } from 'react-i18next'

import type { PricingRule } from '../model/types'

interface RuleParamsProps {
  rule: PricingRule
}

/**
 * Колонка «Параметры»: тип занятия и формат первой строкой,
 * длительность и количество занятий — второй.
 */
export function RuleParams({ rule }: RuleParamsProps) {
  const { t } = useTranslation()

  const top = join(
    [
      t(`finance.pricing.lessonKind.${rule.lesson_kind}`),
      t(`finance.pricing.format.${rule.format}`),
    ],
    ' · ',
  )
  const bottom = join(
    [
      t('finance.pricing.durationPreset', { minutes: rule.duration_minutes }),
      // У безлимита число занятий не имеет смысла — не показываем.
      rule.format === 'unlimited'
        ? null
        : t('finance.pricing.sessionsCount', { count: rule.sessions_count }),
    ].filter(Boolean),
    ' · ',
  )

  return (
    <div className="rule-params">
      <span className="rule-params__top">{top}</span>
      <span className="rule-params__bottom">{bottom}</span>
    </div>
  )
}

import size from 'lodash/size'

import { useTranslation } from 'react-i18next'

import { getPricingSummary } from './pricing-utils'

import type { PricingRule } from '../model/types'

interface PricingSummaryProps {
  rules: PricingRule[]
}

/** Компактная сводка по локации: N тарифов · средняя маржа X ₽ · Prime Y ₽. */
export function PricingSummary({ rules }: PricingSummaryProps) {
  const { t } = useTranslation()
  if (!size(rules)) return null

  const summary = getPricingSummary(rules)

  return (
    <p className="pricing-summary">
      {t('finance.pricing.summary', {
        count: summary.count,
        margin: summary.avgMargin,
        prime: summary.avgPrimeMargin,
      })}
    </p>
  )
}

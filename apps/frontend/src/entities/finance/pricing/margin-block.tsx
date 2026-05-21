import map from 'lodash/map'

import { useTranslation } from 'react-i18next'

import type { PricingRule } from '../model/types'

interface MarginBlockProps {
  rules: PricingRule[]
}

/** Per-rule margin = client price − hall cost, regular and prime. */
export function MarginBlock({ rules }: MarginBlockProps) {
  const { t } = useTranslation()
  if (!rules.length) return null

  return (
    <div className="fin-section">
      <div className="fin-section__header">
        <h3 className="fin-section__title">{t('finance.pricing.marginTitle')}</h3>
      </div>
      <div className="margin-list">
        {map(rules, (rule) => {
          const regular = rule.client_price - rule.hall_cost
          const prime = rule.client_prime_price - rule.hall_prime_cost
          return (
            <div className="margin-row" key={rule.id}>
              <span className="margin-row__label">{rule.title}</span>
              <span className="margin-row__values">
                <span className={`margin-val${regular < 0 ? ' margin-val--neg' : ''}`}>
                  {t('finance.pricing.marginRegular')}: {regular} ₽
                </span>
                <span
                  className={`margin-val margin-val--prime${prime < 0 ? ' margin-val--neg' : ''}`}
                >
                  {t('finance.pricing.marginPrime')}: {prime} ₽
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

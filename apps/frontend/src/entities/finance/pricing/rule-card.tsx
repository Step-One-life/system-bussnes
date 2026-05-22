import { useTranslation } from 'react-i18next'

import { PriceCell } from './price-cell'
import { getRuleMargin } from './pricing-utils'
import { RuleActionsMenu } from './rule-actions-menu'
import { RuleParams } from './rule-params'

import type { PricingRule } from '../model/types'

interface RuleCardProps {
  rule: PricingRule
  onEdit: (rule: PricingRule) => void
  onDuplicate: (rule: PricingRule) => void
  onDelete: (rule: PricingRule) => void
}

/** Мобильная карточка одного тарифа со всеми данными. */
export function RuleCard({ rule, onEdit, onDuplicate, onDelete }: RuleCardProps) {
  const { t } = useTranslation()
  const margin = getRuleMargin(rule)

  return (
    <div className="rule-card">
      <div className="rule-card__head">
        <span className="rule-card__title">{rule.title}</span>
        <RuleActionsMenu
          rule={rule}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
      <div className="rule-card__meta">
        <RuleParams rule={rule} />
      </div>
      <div className="rule-card__grid">
        <div className="rule-card__cell">
          <span className="rule-card__cell-label">{t('finance.pricing.table.client')}</span>
          <PriceCell regular={rule.client_price} prime={rule.client_prime_price} />
        </div>
        <div className="rule-card__cell">
          <span className="rule-card__cell-label">{t('finance.pricing.table.hall')}</span>
          <PriceCell regular={rule.hall_cost} prime={rule.hall_prime_cost} />
        </div>
        <div className="rule-card__cell">
          <span className="rule-card__cell-label">{t('finance.pricing.table.margin')}</span>
          <PriceCell regular={margin.regular} prime={margin.prime} colored />
        </div>
      </div>
    </div>
  )
}

import { Button } from 'antd'
import { EditOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import type { PricingRule } from '../model/types'

interface RuleCardProps {
  rule: PricingRule
  mode: 'client' | 'hall'
  onEdit: (rule: PricingRule) => void
}

/** Mobile-friendly card for a single pricing rule. */
export function RuleCard({ rule, mode, onEdit }: RuleCardProps) {
  const { t } = useTranslation()
  const handleEdit = () => onEdit(rule)

  const regular = mode === 'client' ? rule.client_price : rule.hall_cost
  const prime = mode === 'client' ? rule.client_prime_price : rule.hall_prime_cost

  return (
    <div className="rule-card">
      <div className="rule-card__head">
        <span className="rule-card__title">{rule.title}</span>
        <Button type="text" size="small" icon={<EditOutlined />} onClick={handleEdit} />
      </div>
      <div className="rule-card__meta">
        {t(`finance.pricing.lessonKind.${rule.lesson_kind}`)} ·{' '}
        {t(`finance.pricing.format.${rule.format}`)} ·{' '}
        {t('finance.pricing.durationPreset', { minutes: rule.duration_minutes })} ·{' '}
        {t('finance.pricing.table.sessions')}: {rule.sessions_count}
      </div>
      <div className="rule-card__prices">
        <span className="rule-card__price">
          {t('finance.pricing.marginRegular')}: <b>{regular} ₽</b>
        </span>
        <span className="rule-card__price rule-card__price--prime">
          {t('finance.pricing.marginPrime')}: <b>{prime} ₽</b>
        </span>
      </div>
    </div>
  )
}

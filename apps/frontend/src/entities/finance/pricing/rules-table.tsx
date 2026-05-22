import { Table } from 'antd'

import map from 'lodash/map'

import { useTranslation } from 'react-i18next'

import { PriceCell } from './price-cell'
import { getRuleMargin } from './pricing-utils'
import { RuleActionsMenu } from './rule-actions-menu'
import { RuleCard } from './rule-card'
import { RuleParams } from './rule-params'

import type { PricingRule } from '../model/types'
import type { ColumnsType } from 'antd/es/table'
import type { TFunction } from 'i18next'

interface RuleActions {
  onEdit: (rule: PricingRule) => void
  onDuplicate: (rule: PricingRule) => void
  onDelete: (rule: PricingRule) => void
}

interface RulesTableProps extends RuleActions {
  rules: PricingRule[]
  isMobile: boolean
}

function buildColumns(t: TFunction, actions: RuleActions): ColumnsType<PricingRule> {
  return [
    {
      title: t('finance.pricing.table.tariff'),
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <span className="rule-title">{title}</span>,
    },
    {
      title: t('finance.pricing.table.params'),
      key: 'params',
      render: (_: unknown, rule: PricingRule) => <RuleParams rule={rule} />,
    },
    {
      title: t('finance.pricing.table.client'),
      key: 'client',
      render: (_: unknown, rule: PricingRule) => (
        <PriceCell regular={rule.client_price} prime={rule.client_prime_price} />
      ),
    },
    {
      title: t('finance.pricing.table.hall'),
      key: 'hall',
      render: (_: unknown, rule: PricingRule) => (
        <PriceCell regular={rule.hall_cost} prime={rule.hall_prime_cost} />
      ),
    },
    {
      title: t('finance.pricing.table.margin'),
      key: 'margin',
      render: (_: unknown, rule: PricingRule) => {
        const margin = getRuleMargin(rule)
        return <PriceCell regular={margin.regular} prime={margin.prime} colored />
      },
    },
    {
      title: t('finance.pricing.table.actions'),
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_: unknown, rule: PricingRule) => (
        <RuleActionsMenu
          rule={rule}
          onEdit={actions.onEdit}
          onDuplicate={actions.onDuplicate}
          onDelete={actions.onDelete}
        />
      ),
    },
  ]
}

/** Единая таблица тарифов на десктопе или стек карточек на мобиле. */
export function RulesTable({ rules, isMobile, onEdit, onDuplicate, onDelete }: RulesTableProps) {
  const { t } = useTranslation()

  if (isMobile) {
    return (
      <div className="rule-cards">
        {map(rules, (rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ))}
      </div>
    )
  }

  return (
    <Table<PricingRule>
      rowKey="id"
      size="small"
      pagination={false}
      dataSource={rules}
      columns={buildColumns(t, { onEdit, onDuplicate, onDelete })}
    />
  )
}

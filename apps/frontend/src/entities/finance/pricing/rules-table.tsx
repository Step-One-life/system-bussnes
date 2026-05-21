import { Button, Table } from 'antd'
import { EditOutlined } from '@ant-design/icons'

import map from 'lodash/map'

import { useTranslation } from 'react-i18next'

import { RuleCard } from './rule-card'

import type { PricingRule } from '../model/types'
import type { ColumnsType } from 'antd/es/table'
import type { TFunction } from 'i18next'

interface RulesTableProps {
  rules: PricingRule[]
  mode: 'client' | 'hall'
  isMobile: boolean
  onEdit: (rule: PricingRule) => void
}

function buildColumns(
  t: TFunction,
  mode: 'client' | 'hall',
  onEdit: (rule: PricingRule) => void,
): ColumnsType<PricingRule> {
  const renderEdit = (_: unknown, rule: PricingRule) => {
    const handleEdit = () => onEdit(rule)
    return <Button type="text" size="small" icon={<EditOutlined />} onClick={handleEdit} />
  }
  return [
    { title: t('finance.pricing.ruleForm.titleLabel'), dataIndex: 'title', key: 'title' },
    {
      title: t('finance.pricing.table.lessonKind'),
      key: 'lessonKind',
      render: (_: unknown, r: PricingRule) => t(`finance.pricing.lessonKind.${r.lesson_kind}`),
    },
    {
      title: t('finance.pricing.table.format'),
      key: 'format',
      render: (_: unknown, r: PricingRule) => t(`finance.pricing.format.${r.format}`),
    },
    {
      title: t('finance.pricing.table.duration'),
      key: 'duration',
      render: (_: unknown, r: PricingRule) =>
        t('finance.pricing.durationPreset', { minutes: r.duration_minutes }),
    },
    {
      title: t('finance.pricing.table.sessions'),
      dataIndex: 'sessions_count',
      key: 'sessions',
    },
    {
      title: t('finance.pricing.table.clientPrice'),
      key: 'regular',
      render: (_: unknown, r: PricingRule) =>
        `${mode === 'client' ? r.client_price : r.hall_cost} ₽`,
    },
    {
      title: t('finance.pricing.table.clientPrimePrice'),
      key: 'prime',
      render: (_: unknown, r: PricingRule) =>
        `${mode === 'client' ? r.client_prime_price : r.hall_prime_cost} ₽`,
    },
    { title: '', key: 'actions', width: 56, render: renderEdit },
  ]
}

/** Pricing rules as a desktop table or a stack of mobile cards. */
export function RulesTable({ rules, mode, isMobile, onEdit }: RulesTableProps) {
  const { t } = useTranslation()

  if (isMobile) {
    return (
      <div className="rule-cards">
        {map(rules, (rule) => (
          <RuleCard key={rule.id} rule={rule} mode={mode} onEdit={onEdit} />
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
      columns={buildColumns(t, mode, onEdit)}
    />
  )
}

import { useState } from 'react'

import { Button, Grid, Select } from 'antd'
import { CopyOutlined, PlusOutlined } from '@ant-design/icons'

import map from 'lodash/map'

import { useTranslation } from 'react-i18next'

import { EmptyState } from 'common/ui'
import { useLocations } from 'entities/locations'

import { usePricingRules } from '../api/use-finance'
import { CopyPricingModal } from './copy-pricing-modal'
import { MarginBlock } from './margin-block'
import { RuleFormModal } from './rule-form-modal'
import { RulesTable } from './rules-table'
import { useRuleActions } from './use-rule-actions'

import type { PricingRule } from '../model/types'

import './pricing-tab.scss'

export function PricingTab() {
  const { t } = useTranslation()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const { data: locations = [] } = useLocations()
  const [picked, setPicked] = useState('')

  // Default the selector to the user's default location until the coach picks
  // another one — derived during render to avoid a setState-in-effect cascade.
  const defaultId = locations.length
    ? (locations.find((l) => l.isDefault) ?? locations[0]).id
    : ''
  const locationId = picked || defaultId
  const setLocationId = setPicked

  const { data: rules = [] } = usePricingRules(locationId)
  const actions = useRuleActions(locationId)
  const [copyOpen, setCopyOpen] = useState(false)

  const handleCopyOpen = () => setCopyOpen(true)
  const handleCopyClose = () => setCopyOpen(false)
  const handleAdd = () => actions.openCreate()

  if (!locations.length) {
    return <EmptyState title={t('finance.pricing.noLocations')} />
  }

  return (
    <div>
      <div className="pricing-toolbar">
        <Select
          className="pricing-toolbar__location"
          value={locationId || undefined}
          onChange={setLocationId}
          options={map(locations, (l) => ({ value: l.id, label: l.name }))}
        />
        <Button icon={<CopyOutlined />} onClick={handleCopyOpen} disabled={locations.length < 2}>
          {t('finance.pricing.copyButton')}
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t('finance.pricing.addRule')}
        </Button>
      </div>

      <PricingSection
        title={t('finance.pricing.clientTitle')}
        badge="income"
        badgeText={t('finance.pricing.incomeBadge')}
        rules={rules}
        mode="client"
        isMobile={isMobile}
        onEdit={actions.openEdit}
      />
      <PricingSection
        title={t('finance.pricing.hallTitle')}
        badge="expense"
        badgeText={t('finance.pricing.expenseBadge')}
        rules={rules}
        mode="hall"
        isMobile={isMobile}
        onEdit={actions.openEdit}
      />
      <MarginBlock rules={rules} />

      <RuleFormModal
        open={actions.modalOpen}
        locationId={locationId}
        rule={actions.editing}
        onClose={actions.close}
        onDelete={actions.remove}
      />
      <CopyPricingModal open={copyOpen} toLocationId={locationId} onClose={handleCopyClose} />
    </div>
  )
}

interface PricingSectionProps {
  title: string
  badge: 'income' | 'expense'
  badgeText: string
  rules: PricingRule[]
  mode: 'client' | 'hall'
  isMobile: boolean
  onEdit: (rule: PricingRule) => void
}

function PricingSection({
  title,
  badge,
  badgeText,
  rules,
  mode,
  isMobile,
  onEdit,
}: PricingSectionProps) {
  const { t } = useTranslation()
  return (
    <div className="fin-section">
      <div className="fin-section__header">
        <h3 className="fin-section__title">{title}</h3>
        <span className={`fin-section__badge fin-section__badge--${badge}`}>{badgeText}</span>
      </div>
      {rules.length ? (
        <RulesTable rules={rules} mode={mode} isMobile={isMobile} onEdit={onEdit} />
      ) : (
        <p className="pricing-empty">{t('finance.pricing.noRules')}</p>
      )}
    </div>
  )
}

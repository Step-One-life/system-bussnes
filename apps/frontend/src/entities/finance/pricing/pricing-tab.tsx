import { useState } from 'react'

import { Button, Grid, Select } from 'antd'
import { CopyOutlined, PlusOutlined } from '@ant-design/icons'

import find from 'lodash/find'
import map from 'lodash/map'
import size from 'lodash/size'

import { useTranslation } from 'react-i18next'

import { EmptyState } from 'common/ui'
import { useLocations } from 'entities/locations'

import { usePricingRules } from '../api/use-finance'
import { CopyPricingModal } from './copy-pricing-modal'
import { PricingSummary } from './pricing-summary'
import { RuleFormModal } from './rule-form-modal'
import { RulesTable } from './rules-table'
import { useRuleActions } from './use-rule-actions'

import './pricing-tab.scss'

export function PricingTab() {
  const { t } = useTranslation()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const { data: locations = [] } = useLocations()
  const [picked, setPicked] = useState('')

  // По умолчанию выбираем дефолтную локацию тренера, пока он не выбрал другую —
  // вычисляем при рендере, чтобы не плодить setState-каскад в эффекте.
  const defaultId = size(locations)
    ? (find(locations, (l) => l.isDefault) ?? locations[0]).id
    : ''
  const locationId = picked || defaultId

  const { data: rules = [] } = usePricingRules(locationId)
  const actions = useRuleActions(locationId)
  const [copyOpen, setCopyOpen] = useState(false)

  const handleCopyOpen = () => setCopyOpen(true)
  const handleCopyClose = () => setCopyOpen(false)
  const handleAdd = () => actions.openCreate()

  if (!size(locations)) {
    return <EmptyState title={t('finance.pricing.noLocations')} />
  }

  return (
    <div>
      <div className="pricing-toolbar">
        <Select
          className="pricing-toolbar__location"
          value={locationId || undefined}
          onChange={setPicked}
          options={map(locations, (l) => ({ value: l.id, label: l.name }))}
        />
        <Button
          icon={<CopyOutlined />}
          onClick={handleCopyOpen}
          disabled={size(locations) < 2}
        >
          {t('finance.pricing.copyButton')}
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t('finance.pricing.addRule')}
        </Button>
      </div>

      <div className="fin-section">
        <div className="fin-section__header">
          <h3 className="fin-section__title">{t('finance.pricing.tariffsTitle')}</h3>
        </div>
        {size(rules) ? (
          <>
            <RulesTable
              rules={rules}
              isMobile={isMobile}
              onEdit={actions.openEdit}
              onDuplicate={actions.duplicate}
              onDelete={actions.remove}
            />
            <PricingSummary rules={rules} />
          </>
        ) : (
          <p className="pricing-empty">{t('finance.pricing.noRules')}</p>
        )}
      </div>

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

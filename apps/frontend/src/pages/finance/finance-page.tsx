import { useTranslation } from 'react-i18next'

import { PageHeader } from 'common/ui'
import { PricingTab, RecordsTab, StatsTab } from 'entities/finance'
import { LocationsPanel } from 'entities/locations'

import { useFinancePage } from './use-finance-page'

import type { FinanceTab } from './use-finance-page'

import './finance-page.scss'

export function FinancePage() {
  const { t } = useTranslation()
  const page = useFinancePage()

  const tabs: { value: FinanceTab; label: string }[] = [
    { value: 'records', label: t('finance.tabs.records') },
    { value: 'stats', label: t('finance.tabs.stats') },
    { value: 'pricing', label: t('finance.tabs.pricing') },
    { value: 'locations', label: t('finance.tabs.locations') },
  ]

  const handleSelectTab = (value: FinanceTab) => () => page.setTab(value)

  return (
    <div>
      <PageHeader title={t('nav.finance')} />

      <div className="fin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            className={`fin-tab${page.tab === tab.value ? ' fin-tab--active' : ''}`}
            onClick={handleSelectTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {page.tab === 'records' && <RecordsTab />}
      {page.tab === 'stats' && <StatsTab />}
      {page.tab === 'pricing' && <PricingTab onAddLocation={() => page.setTab('locations')} />}
      {page.tab === 'locations' && <LocationsPanel />}
    </div>
  )
}

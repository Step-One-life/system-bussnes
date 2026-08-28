import { lazy, Suspense } from 'react'

import { useTranslation } from 'react-i18next'

import { ListSkeleton, PageHeader } from 'common/ui'
import { PricingTab } from 'entities/finance/pricing/pricing-tab'
import { RecordsTab } from 'entities/finance/records/records-tab'
import { LocationsPanel } from 'entities/locations'

import { useFinancePage } from './use-finance-page'

import type { FinanceTab } from './use-finance-page'

import './finance-page.scss'

// chart.js (163 КБ) нужен ТОЛЬКО этой вкладке: через бочку он попадал в
// предзагрузку каждой страницы, включая экран логина.
const StatsTab = lazy(() =>
  import('entities/finance/stats/stats-tab').then((m) => ({ default: m.StatsTab })),
)

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
      {page.tab === 'stats' && <Suspense fallback={<ListSkeleton rows={4} />}><StatsTab /></Suspense>}
      {page.tab === 'pricing' && <PricingTab onAddLocation={() => page.setTab('locations')} />}
      {page.tab === 'locations' && <LocationsPanel />}
    </div>
  )
}

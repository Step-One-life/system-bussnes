import { Tooltip } from 'antd'
import {
  BarChartOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  FileTextOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { ErrorState } from 'common/ui'

import { BreakdownChart, MonthlyChart, TopClientsChart } from './finance-charts'
import { useFinanceStats } from './use-finance-stats'

import type { FinancePeriod } from './use-finance-stats'

import './chart-setup'
import './stats-tab.scss'

const PERIODS: FinancePeriod[] = ['month', 'quarter', 'year', 'all']

const PERIOD_KEYS: Record<FinancePeriod, string> = {
  month: 'finance.stats.periodMonth',
  quarter: 'finance.stats.periodQuarter',
  year: 'finance.stats.periodYear',
  all: 'finance.stats.periodAll',
}

interface DeltaTagProps {
  pct: number | null
  /** Для расходов рост — это плохо: инвертирует окраску. */
  invert?: boolean
  hint: string
}

/** «▲ 12%» к прошлому периоду; при пустой базе сравнения не рендерится. */
function DeltaTag({ pct, invert, hint }: DeltaTagProps) {
  if (pct === null) return null
  const good = invert ? pct <= 0 : pct >= 0
  const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '='
  const color =
    pct === 0
      ? 'var(--tk-text-tertiary)'
      : good
        ? 'var(--tk-success-text)'
        : 'var(--tk-danger-text)'
  return (
    <Tooltip title={hint}>
      <span className="fin-hero__delta" style={{ color }}>
        {arrow} {Math.abs(pct)}%
      </span>
    </Tooltip>
  )
}

export function StatsTab() {
  const { t } = useTranslation()
  const stats = useFinanceStats()
  const { totals } = stats

  const handleSelectPeriod = (p: FinancePeriod) => () => stats.setPeriod(p)

  if (stats.isError) return <ErrorState onRetry={stats.refetch} />

  const deltaHint = t('finance.stats.deltaVs', { period: stats.prevPeriodLabel })

  const netColor = totals.netIncome >= 0 ? 'var(--tk-success-text)' : 'var(--tk-danger-text)'
  const marginColor =
    totals.margin >= 50
      ? 'var(--tk-success-text)'
      : totals.margin >= 20
        ? 'var(--tk-warning-text)'
        : 'var(--tk-danger-text)'

  return (
    <div>
      <div className="fin-period-selector">
        {PERIODS.map((p) => (
          <button
            key={p}
            className={`fin-period-btn${stats.period === p ? ' fin-period-btn--active' : ''}`}
            onClick={handleSelectPeriod(p)}
          >
            {t(PERIOD_KEYS[p])}
          </button>
        ))}
      </div>

      {stats.period !== 'all' && (
        <div className="fin-period-nav">
          <button
            className="fin-period-nav__btn"
            onClick={stats.prev}
            aria-label={t('finance.stats.periodPrev')}
          >
            ‹
          </button>
          <span className="fin-period-nav__label">{stats.periodLabel}</span>
          <button
            className="fin-period-nav__btn"
            onClick={stats.next}
            disabled={!stats.canGoNext}
            aria-label={t('finance.stats.periodNext')}
          >
            ›
          </button>
        </div>
      )}

      <div className="fin-hero">
        <div className="fin-hero__item">
          <span className="fin-hero__label">{t('finance.stats.income')}</span>
          <span className="fin-hero__value" style={{ color: 'var(--tk-success-text)' }}>
            {totals.totalIncome.toLocaleString('ru')} ₽
          </span>
          {stats.delta && <DeltaTag pct={stats.delta.incomePct} hint={deltaHint} />}
        </div>
        <div className="fin-hero__op">−</div>
        <div className="fin-hero__item">
          <span className="fin-hero__label">{t('finance.stats.hallExpense')}</span>
          <span className="fin-hero__value" style={{ color: 'var(--tk-danger-text)' }}>
            {totals.totalHall.toLocaleString('ru')} ₽
          </span>
          {stats.delta && <DeltaTag pct={stats.delta.hallPct} invert hint={deltaHint} />}
        </div>
        <div className="fin-hero__op">=</div>
        <div className="fin-hero__item fin-hero__item--main">
          <span className="fin-hero__label">{t('finance.stats.netIncome')}</span>
          <span
            className="fin-hero__value fin-hero__value--main"
            style={{ color: netColor }}
          >
            {totals.netIncome >= 0 ? '+' : ''}
            {totals.netIncome.toLocaleString('ru')} ₽
          </span>
          {stats.delta && <DeltaTag pct={stats.delta.netPct} hint={deltaHint} />}
        </div>
      </div>

      <div className="fin-pills">
        <div className="fin-pill">
          <span className="fin-pill__icon"><BarChartOutlined /></span>
          <span className="fin-pill__label">{t('finance.stats.margin')}</span>
          <span className="fin-pill__value" style={{ color: marginColor }}>
            {totals.margin}%
          </span>
        </div>
        <div className="fin-pill">
          <span className="fin-pill__icon"><FileTextOutlined /></span>
          <span className="fin-pill__label">{t('finance.stats.records')}</span>
          <span className="fin-pill__value">{totals.recordCount}</span>
        </div>
        <div className="fin-pill">
          <span className="fin-pill__icon"><CheckCircleOutlined /></span>
          <span className="fin-pill__label">{t('finance.stats.active')}</span>
          <span className="fin-pill__value">{totals.activeCount}</span>
        </div>
        <div className="fin-pill">
          <span className="fin-pill__icon"><CreditCardOutlined /></span>
          <span className="fin-pill__label">{t('finance.stats.avgCheck')}</span>
          <span className="fin-pill__value">
            {totals.avgCheck.toLocaleString('ru')} ₽
          </span>
        </div>
      </div>

      <div className="fin-charts-grid">
        <MonthlyChart data={stats.monthly} />
        <BreakdownChart title={t('finance.stats.clientPayments')} data={stats.clientTypes} />
        <BreakdownChart
          title={t('finance.stats.hallPayments')}
          data={stats.hallTypes}
          colorOffset={2}
        />
        <TopClientsChart data={stats.topClients} />
      </div>
    </div>
  )
}

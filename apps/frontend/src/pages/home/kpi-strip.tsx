import { useTranslation } from 'react-i18next'

import { useCountUp } from 'common/hooks/use-count-up'

import type { KpiType } from './kpi-detail-modal'
import type { DashboardKPIs } from 'common/lib/kpi'

import './kpi-strip.scss'

interface KpiStripProps {
  kpis: DashboardKPIs
  onSelect: (type: KpiType) => void
}

interface CellProps {
  label: string
  value: number
  /** Цвет точки-индикатора у ненулевого проблемного показателя. */
  dot?: 'danger' | 'warn'
  onClick: () => void
}

function KpiStripCell({ label, value, dot, onClick }: CellProps) {
  const animated = useCountUp(value)
  return (
    <button type="button" className="kpi-strip__cell" onClick={onClick}>
      <span className="kpi-strip__label">{label}</span>
      <span className={`kpi-strip__value${value === 0 ? ' kpi-strip__value--zero' : ''}`}>
        {animated}
        {dot && value > 0 && <i className={`kpi-strip__dot kpi-strip__dot--${dot}`} />}
      </span>
    </button>
  )
}

export function KpiStrip({ kpis, onSelect }: KpiStripProps) {
  const { t } = useTranslation()

  const handleExpired = () => onSelect('expired')
  const handleEnding = () => onSelect('ending')
  const handleMonth = () => onSelect('month')
  const handleTotal = () => onSelect('total')

  return (
    <div className="kpi-strip">
      <KpiStripCell
        label={t('home.kpiExpiredShort')}
        value={kpis.expired}
        dot="danger"
        onClick={handleExpired}
      />
      <KpiStripCell
        label={t('home.kpiEndingShort')}
        value={kpis.ending}
        dot="warn"
        onClick={handleEnding}
      />
      <KpiStripCell
        label={t('home.kpiMonthShort')}
        value={kpis.monthTrainings}
        onClick={handleMonth}
      />
      <KpiStripCell
        label={t('home.kpiTotalShort')}
        value={kpis.total}
        onClick={handleTotal}
      />
    </div>
  )
}

import { useCountUp } from 'common/hooks/use-count-up'

import type { ReactNode } from 'react'

import './kpi-card.scss'

export type KpiVariant = 'accent' | 'ok' | 'warn' | 'danger'

interface KpiCardProps {
  label: string
  value: number
  icon?: ReactNode
  variant?: KpiVariant
  /** Приглушить карточку при value = 0, чтобы нулевой показатель не тянул внимание. */
  dimZero?: boolean
  onClick?: () => void
}

export function KpiCard({ label, value, icon, variant = 'accent', dimZero, onClick }: KpiCardProps) {
  const animated = useCountUp(value)
  const dim = dimZero && value === 0
  return (
    <div
      className={`kpi-card kpi-card--${variant}${dim ? ' kpi-card--dim' : ''}${onClick ? ' kpi-card--clickable' : ''}`}
      onClick={onClick}
    >
      {icon && <div className="kpi-card__icon">{icon}</div>}
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">{animated}</div>
    </div>
  )
}

import type { ReactNode } from 'react'

import './warning-item.scss'

interface WarningItemProps {
  name: string
  detail: string
  danger?: boolean
  action?: ReactNode
  onClick?: () => void
}

export function WarningItem({ name, detail, danger, action, onClick }: WarningItemProps) {
  return (
    // --dot — токен-скин компонента (точка статуса вместо цветной полосы);
    // сырые классы .warning-item на других экранах остаются на легаси-стилях.
    <div
      className={`warning-item warning-item--dot${danger ? ' warning-item--danger' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <span className="warning-item__status-dot" />
      <div className="warning-item__main">
        <div className="warning-item__name">{name}</div>
        <div className="warning-item__detail">{detail}</div>
      </div>
      {action}
    </div>
  )
}

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
    <div
      className={`warning-item${danger ? ' warning-item--danger' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="warning-item__main">
        <div className="warning-item__name">{name}</div>
        <div className="warning-item__detail">{detail}</div>
      </div>
      {action}
    </div>
  )
}

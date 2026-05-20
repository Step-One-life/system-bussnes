import type { ReactNode } from 'react'

import './page-header.scss'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  back?: ReactNode
}

export function PageHeader({ title, subtitle, actions, back }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header__main">
        {back}
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  )
}

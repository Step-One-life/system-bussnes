import type { ReactNode } from 'react'

import './page-header.scss'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Мелкая строка над заголовком (например, дата «Чт, 11 июня»). */
  overline?: string
  actions?: ReactNode
  back?: ReactNode
}

export function PageHeader({ title, subtitle, overline, actions, back }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header__main">
        {back}
        {overline && <div className="page-overline">{overline}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  )
}

import { InboxOutlined } from '@ant-design/icons'

import type { ReactNode } from 'react'

import './empty-state.scss'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  text?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon ?? <InboxOutlined />}</span>
      <div className="empty-state__title">{title}</div>
      {text && <p className="empty-state__text">{text}</p>}
      {action}
    </div>
  )
}

import type { SubStatus, SubStatusType } from 'entities/students/model/types'

import './badge.scss'

const STATUS_CLASS: Record<SubStatusType, string> = {
  active: 'active',
  ending: 'warn',
  danger: 'danger',
  expired: 'danger',
  none: 'neutral',
}

export function StatusBadge({ status }: { status: SubStatus }) {
  const cls = STATUS_CLASS[status.type] ?? 'neutral'
  return <span className={`badge badge--${cls}`}>{status.label}</span>
}

export type BadgeVariant = 'active' | 'warn' | 'danger' | 'neutral' | 'accent' | 'ind'

export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: BadgeVariant
  children: React.ReactNode
}) {
  return <span className={`badge badge--${variant}`}>{children}</span>
}

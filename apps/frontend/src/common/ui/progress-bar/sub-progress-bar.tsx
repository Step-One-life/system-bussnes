import { formatDateShort } from 'common/utils/date'
import { getDaysRemaining, getSubProgress, subLabel } from 'entities/students/model/subscription-status'

import type { Subscription } from 'entities/students/model/types'

import './progress-bar.scss'

function daysLabel(days: number) {
  if (days < 0)
    return <span style={{ color: 'var(--tk-danger-text)' }}>истёк {Math.abs(days)} дн. назад</span>
  if (days === 0) return <span style={{ color: 'var(--tk-danger-text)' }}>последний день</span>
  if (days <= 7) return <span style={{ color: 'var(--tk-warning-text)' }}>{days} дн.</span>
  return <span style={{ color: 'var(--tk-text-secondary)' }}>{days} дн.</span>
}

export function SubProgressBar({ sub }: { sub: Subscription | null }) {
  if (!sub) return <span style={{ color: 'var(--tk-text-tertiary)', fontSize: '0.85rem' }}>—</span>

  const { pct, cls } = getSubProgress(sub)
  const days = getDaysRemaining(sub)

  return (
    <div className="progress-wrap">
      <div className="progress-label">
        <span>{subLabel(sub)}</span>
        <span>
          {sub.remaining}/{sub.total} занятий
        </span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill progress-fill--${cls}`} style={{ width: `${pct}%` }} />
      </div>
      {sub.expiresAt && (
        <div className="progress-label" style={{ marginTop: 3 }}>
          <span style={{ color: 'var(--tk-text-tertiary)' }}>до {formatDateShort(sub.expiresAt)}</span>
          {days !== null && daysLabel(days)}
        </div>
      )}
    </div>
  )
}

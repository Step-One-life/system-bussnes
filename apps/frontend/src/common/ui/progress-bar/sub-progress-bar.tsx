import { useTranslation } from 'react-i18next'

import { formatDateShort } from 'common/utils/date'
import { getDaysRemaining, getSubProgress, subLabel } from 'entities/students/model/subscription-status'

import type { Subscription } from 'entities/students/model/types'

import './progress-bar.scss'

export function SubProgressBar({ sub }: { sub: Subscription | null }) {
  const { t } = useTranslation()

  if (!sub) return <span style={{ color: 'var(--tk-text-tertiary)', fontSize: '0.85rem' }}>—</span>

  const { pct, cls } = getSubProgress(sub)
  const days = getDaysRemaining(sub)

  // Замыкает t — строки идут через i18next (раньше были захардкожены по-русски).
  const daysLabel = (d: number) => {
    if (d < 0)
      return (
        <span style={{ color: 'var(--tk-danger-text)' }}>
          {t('students.subCard.expiredAgo', { count: Math.abs(d) })}
        </span>
      )
    if (d === 0)
      return <span style={{ color: 'var(--tk-danger-text)' }}>{t('students.sub.lastDay')}</span>
    if (d <= 7)
      return (
        <span style={{ color: 'var(--tk-warning-text)' }}>
          {t('students.sub.daysShort', { count: d })}
        </span>
      )
    return (
      <span style={{ color: 'var(--tk-text-secondary)' }}>
        {t('students.sub.daysShort', { count: d })}
      </span>
    )
  }

  return (
    <div className="progress-wrap">
      <div className="progress-label">
        <span>{subLabel(sub)}</span>
        <span>
          {sub.isUnlimited
            ? '∞'
            : t('students.sub.sessionsOf', { remaining: sub.remaining, total: sub.total })}
        </span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill progress-fill--${cls}`} style={{ width: `${pct}%` }} />
      </div>
      {sub.expiresAt && (
        <div className="progress-label" style={{ marginTop: 3 }}>
          <span style={{ color: 'var(--tk-text-tertiary)' }}>
            {t('students.sub.validUntil', { date: formatDateShort(sub.expiresAt) })}
          </span>
          {days !== null && daysLabel(days)}
        </div>
      )}
    </div>
  )
}

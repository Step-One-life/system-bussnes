import { useTranslation } from 'react-i18next'

import { isPrimeTime } from '../model/training-logic'

import type { TrainingConflict } from '../model/types'

import './training-modals.scss'

export function PrimeHint({ date, time }: { date: string; time: string }) {
  const { t } = useTranslation()
  if (!time) return <div className="prime-hint" />
  const prime = isPrimeTime(date, time)
  return (
    <div className="prime-hint">
      <span className={`badge ${prime ? 'badge--prime' : 'badge--neutral'}`}>
        {prime ? t('trainings.hint.prime') : t('trainings.hint.regular')}
      </span>
    </div>
  )
}

export function ConflictHint({ conflicts }: { conflicts: TrainingConflict[] }) {
  const { t } = useTranslation()
  if (!conflicts.length) return null
  const detail = conflicts.map((c) => `«${c.groupId}» ${c.start}–${c.end}`).join(', ')
  return (
    <div className="conflict-hint is-visible">{t('trainings.hint.conflict', { detail })}</div>
  )
}

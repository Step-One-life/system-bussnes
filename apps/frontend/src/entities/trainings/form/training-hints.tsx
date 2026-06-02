import { useTranslation } from 'react-i18next'

import { useLocations } from 'entities/locations'

import { isPrimeTime } from '../model/training-logic'

import type { TrainingConflict } from '../model/types'

import './training-modals.scss'

export function PrimeHint({ date, time, locationId }: { date: string; time: string; locationId?: string | null }) {
  const { t } = useTranslation()
  const { data: locations = [] } = useLocations()
  if (!time) return <div className="prime-hint" />
  const location = locationId ? (locations.find((l) => l.id === locationId) ?? null) : null
  const prime = isPrimeTime(date, time, location)
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

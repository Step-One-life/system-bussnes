import { useTranslation } from 'react-i18next'

import { Badge, StatusBadge } from 'common/ui'
import { formatDateShort } from 'common/utils/date'

import { getActiveSubSummary, getInitials } from '../model/student-helpers'
import { getLastVisitDate } from '../model/students.repo'
import { getOverallSubStatus } from '../model/subscription-status'

import type { Student } from '../model/types'

import './student-card.scss'

interface StudentCardProps {
  student: Student
  indNames: string[]
  onClick: (id: string) => void
}

export function StudentCard({ student, indNames, onClick }: StudentCardProps) {
  const { t } = useTranslation()
  const status = getOverallSubStatus(student)
  const lastVisit = getLastVisitDate(student)
  const regularGroups = student.groups.filter((g) => !indNames.includes(g))
  const hasInd = student.groups.some((g) => indNames.includes(g))

  const handleClick = () => onClick(student.id)

  return (
    <div className="student-card" onClick={handleClick}>
      <div className="student-card__top">
        <div className="student-card__avatar">{getInitials(student.name)}</div>
        <div className="student-card__info">
          <div className="student-card__name">{student.name}</div>
          <div className="student-card__groups">
            {regularGroups.map((g) => (
              <Badge key={g} variant="accent">
                {g}
              </Badge>
            ))}
            {hasInd && <Badge variant="ind">{t('students.indShort')}</Badge>}
            {!regularGroups.length && !hasInd && (
              <span style={{ color: 'var(--tk-text-tertiary)', fontSize: '0.78rem' }}>
                {t('students.noGroup')}
              </span>
            )}
          </div>
        </div>
        <div className="student-card__status">
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="student-card__bottom">
        <span className="student-card__sub">{getActiveSubSummary(student, indNames)}</span>
        <span className="student-card__visit">
          {lastVisit ? formatDateShort(lastVisit) : '—'}
        </span>
      </div>
    </div>
  )
}

import { Button } from 'antd'
import { CloseOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { Badge } from 'common/ui'
import { formatDateShort } from 'common/utils/date'

import type { Student } from '../model/types'

interface VisitHistoryProps {
  student: Student
  indNames: string[]
  onRemoveVisit: (index: number) => void
}

export function VisitHistory({ student, indNames, onRemoveVisit }: VisitHistoryProps) {
  const { t } = useTranslation()
  if (!student.visitHistory.length) {
    return (
      <p style={{ color: 'var(--tk-text-tertiary)', fontSize: '0.85rem' }}>
        {t('students.visits.empty')}
      </p>
    )
  }

  const visits = student.visitHistory
    .map((v, i) => ({ ...v, _i: i }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15)

  const handleRemoveVisit = (index: number) => () => onRemoveVisit(index)

  return (
    <div>
      {visits.map((v) => {
        const label = indNames.includes(v.groupId) ? t('students.visits.indTraining') : v.groupId
        return (
          <div key={v._i} className="visit-row">
            <span style={{ color: 'var(--tk-text-secondary)' }}>{formatDateShort(v.date)}</span>
            <Badge variant="accent">{label}</Badge>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              style={{ marginLeft: 'auto' }}
              aria-label={t('common.remove')}
              onClick={handleRemoveVisit(v._i)}
            />
          </div>
        )
      })}
    </div>
  )
}

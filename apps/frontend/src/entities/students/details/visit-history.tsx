import { Button, Popconfirm } from 'antd'
import { CloseOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { Badge } from 'common/ui'
import { formatDateShort } from 'common/utils/date'

import type { Student, VisitRecord } from '../model/types'

interface VisitHistoryProps {
  student: Student
  indNames: string[]
  /** Визит передаётся целиком: адресация по индексу снимала отметку не с того занятия. */
  onRemoveVisit: (visit: VisitRecord) => void
  /** Идёт снятие отметки — кнопки заблокированы, второй клик невозможен. */
  removing?: boolean
}

export function VisitHistory({
  student,
  indNames,
  onRemoveVisit,
  removing = false,
}: VisitHistoryProps) {
  const { t } = useTranslation()
  if (!student.visitHistory.length) {
    return (
      <p style={{ color: 'var(--tk-text-tertiary)', fontSize: '0.85rem' }}>
        {t('students.visits.empty')}
      </p>
    )
  }

  const visits = [...student.visitHistory]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15)

  const handleRemoveVisit = (visit: VisitRecord) => () => onRemoveVisit(visit)

  return (
    <div>
      {visits.map((v) => {
        const label = indNames.includes(v.groupId) ? t('students.visits.indTraining') : v.groupId
        return (
          <div key={`${v.date}-${v.trainingId}-${v.groupId}`} className="visit-row">
            <span style={{ color: 'var(--tk-text-secondary)' }}>{formatDateShort(v.date)}</span>
            <Badge variant="accent">{label}</Badge>
            <Popconfirm
              title={t('students.visits.removeTitle', { date: formatDateShort(v.date) })}
              description={t('students.visits.removeHint')}
              okText={t('common.remove')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={handleRemoveVisit(v)}
            >
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                style={{ marginLeft: 'auto' }}
                disabled={removing}
                aria-label={t('common.remove')}
              />
            </Popconfirm>
          </div>
        )
      })}
    </div>
  )
}

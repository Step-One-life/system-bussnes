import { useState } from 'react'

import { Button, Popconfirm } from 'antd'
import {
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  SyncOutlined,
  UserAddOutlined,
} from '@ant-design/icons'

import find from 'lodash/find'

import { useTranslation } from 'react-i18next'

import { formatDay, formatDayOfWeek, formatMonth } from 'common/utils/date'
import { useLocations } from 'entities/locations'

import { isIndividualTraining } from '../model/training-helpers'

import type { Training } from '../model/types'
import type { Group } from 'entities/groups/model/types'
import type { Student } from 'entities/students/model/types'
import type { MouseEvent } from 'react'

import './training-item.scss'

interface TrainingItemProps {
  training: Training
  students: Student[]
  groups: Group[]
  onAddStudent: (training: Training) => void
  onRemoveStudent: (training: Training, studentId: string) => void
  onDelete: (training: Training) => void
  onEdit?: (training: Training) => void
}

export function TrainingItem({
  training,
  students,
  groups,
  onAddStudent,
  onRemoveStudent,
  onDelete,
  onEdit,
}: TrainingItemProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const { data: locations = [] } = useLocations()
  const locationName = training.locationId
    ? (find(locations, (l) => l.id === training.locationId)?.name ?? '')
    : ''

  const handleToggleExpanded = () => setExpanded((v) => !v)
  const handleAddStudent = () => onAddStudent(training)
  const handleHeaderAddStudent = (e: MouseEvent) => {
    e.stopPropagation()
    onAddStudent(training)
  }
  const handleRemoveStudent = (studentId: string) => () =>
    onRemoveStudent(training, studentId)
  const handleDelete = () => onDelete(training)
  const handleEdit = () => onEdit?.(training)

  const isInd = isIndividualTraining(training.groupId, groups)
  const clientName = isInd
    ? (students.find((s) => s.id === training.attendees[0])?.name ?? null)
    : null
  const title = clientName
    ? t('trainings.item.indWith', { name: clientName })
    : training.groupId

  const meta = [
    training.time || '',
    isInd ? '' : t('trainings.calendar.attendeesCount', { count: training.attendees.length }),
    locationName,
    training.note || '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={`training-item${expanded ? ' expanded' : ''}`}>
      <div className="training-item__header" onClick={handleToggleExpanded}>
        <div className="training-item__date">
          <span className="training-item__dow">{formatDayOfWeek(training.date)}</span>
          <span className="training-item__day">{formatDay(training.date)}</span>
          <span className="training-item__mon">{formatMonth(training.date)}</span>
        </div>
        <div className="training-item__info">
          <div className="training-item__group">
            {title}
            {training.recurring && (
              <span className="badge--recurring">
                <SyncOutlined /> {t('trainings.item.weekly')}
              </span>
            )}
          </div>
          {meta && <div className="training-item__meta">{meta}</div>}
        </div>
        <Button
          type="text"
          size="small"
          icon={<UserAddOutlined />}
          title={t('trainings.item.addStudent')}
          onClick={handleHeaderAddStudent}
        />
        <DownOutlined className="training-item__chevron" />
      </div>

      <div className="training-item__body">
        {training.attendees.length ? (
          <div className="training-item__attendees">
            {training.attendees.map((id) => {
              const name = students.find((s) => s.id === id)?.name ?? t('trainings.item.deleted')
              return (
                <span key={id} className="attendee-tag">
                  {name}
                  <button
                    className="attendee-tag__remove"
                    title={t('trainings.item.removeFromTraining')}
                    onClick={handleRemoveStudent(id)}
                  >
                    <CloseOutlined />
                  </button>
                </span>
              )
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {t('trainings.item.noAttendees')}
          </p>
        )}

        <div className="training-item__actions">
          <Button size="small" icon={<UserAddOutlined />} onClick={handleAddStudent}>
            {t('trainings.item.addStudent')}
          </Button>
          {onEdit && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              title={t('trainings.item.edit')}
              onClick={handleEdit}
            />
          )}
          <Popconfirm
            title={t('trainings.item.deleteTitle')}
            description={t('trainings.item.deleteDescription')}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={handleDelete}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              title={t('trainings.item.deleteTraining')}
            />
          </Popconfirm>
        </div>
      </div>
    </div>
  )
}

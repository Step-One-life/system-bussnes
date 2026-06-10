import { Button, Modal, Popconfirm } from 'antd'
import { CloseOutlined, DeleteOutlined, EditOutlined, UserAddOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { Badge } from 'common/ui'
import { formatDateFull } from 'common/utils/date'

import { useCalendarTraining } from './use-calendar-training'

import type { CalendarBlock } from '../calendar/calendar-model'
import type { Training } from '../model/types'
import type { AttendRow } from './use-calendar-training'

import './training-modals.scss'

const STATUS_VARIANT = {
  active: 'active',
  ending: 'warn',
  danger: 'danger',
  expired: 'danger',
  none: 'neutral',
} as const

interface CalendarTrainingModalProps {
  open: boolean
  block: CalendarBlock | null
  onClose: () => void
  onAddStudent: (training: Training) => void
  onEdit?: (training: Training) => void
}

export function CalendarTrainingModal({
  open,
  block,
  onClose,
  onAddStudent,
  onEdit,
}: CalendarTrainingModalProps) {
  if (!block) return null
  return (
    <CalendarTrainingModalInner
      block={block}
      open={open}
      onClose={onClose}
      onAddStudent={onAddStudent}
      onEdit={onEdit}
    />
  )
}

function RowItem({
  row,
  checkbox,
  checked,
  onToggle,
  onRemove,
}: {
  row: AttendRow
  checkbox: boolean
  checked?: boolean
  onToggle?: () => void
  onRemove?: () => void
}) {
  const { t } = useTranslation()
  return (
    <label className={`cal-attend-row${checked ? ' cal-attend-row--checked' : ''}`}>
      {checkbox && <input type="checkbox" checked={!!checked} onChange={onToggle} />}
      <div className="cal-attend-info">
        <span className="cal-attend-name">{row.name}</span>
        {row.subLine && <span className="cal-attend-sub">{row.subLine}</span>}
      </div>
      <Badge variant={STATUS_VARIANT[row.status.type]}>{row.status.label}</Badge>
      {onRemove && (
        <button
          type="button"
          className="attendee-tag__remove"
          onClick={onRemove}
          title={t('common.remove')}
        >
          <CloseOutlined />
        </button>
      )}
    </label>
  )
}

function CalendarTrainingModalInner({
  block,
  open,
  onClose,
  onAddStudent,
  onEdit,
}: {
  block: CalendarBlock
  open: boolean
  onClose: () => void
  onAddStudent: (training: Training) => void
  onEdit?: (training: Training) => void
}) {
  const { t } = useTranslation()
  const m = useCalendarTraining({ block, onDone: onClose })

  const dateLabel = `${formatDateFull(block.date)}${block.time ? ` · ${block.time}` : ''}`

  const handleAddStudent = () => {
    if (m.training) {
      onClose()
      onAddStudent(m.training)
    }
  }
  const handleToggleAttendee = (studentId: string) => () =>
    m.toggle(studentId)

  const footer: React.ReactNode[] = []
  footer.push(
    <Button key="save" type="primary" loading={m.saving} onClick={m.saveAttendance}>
      {t('common.save')}
    </Button>,
  )
  if (m.isInd) {
    footer.push(
      <Button
        key="add"
        icon={<UserAddOutlined />}
        disabled={!m.training}
        onClick={handleAddStudent}
      >
        {t('common.add')}
      </Button>,
    )
  }
  if (m.training) {
    if (onEdit) {
      footer.push(
        <Button
          key="edit"
          icon={<EditOutlined />}
          onClick={() => {
            if (m.training && onEdit) {
              onClose()
              onEdit(m.training)
            }
          }}
        >
          {t('trainings.cal.edit')}
        </Button>,
      )
    }
    footer.push(
      <Popconfirm
        key="del"
        title={t('trainings.cal.deleteTitle')}
        description={t('trainings.cal.deleteDescription')}
        okText={t('common.delete')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true }}
        onConfirm={m.handleDelete}
      >
        <Button type="text" danger icon={<DeleteOutlined />} style={{ marginRight: 'auto' }} />
      </Popconfirm>,
    )
  }

  return (
    <Modal open={open} title={m.title} onCancel={onClose} footer={footer} destroyOnHidden>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{dateLabel}</div>

        {m.isInd ? (
          <div className="cal-attend-list">
            {m.indRows.length ? (
              m.indRows.map((row) => (
                <RowItem
                  key={row.studentId}
                  row={row}
                  checkbox
                  checked={m.checked.has(row.studentId)}
                  onToggle={handleToggleAttendee(row.studentId)}
                />
              ))
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {t('trainings.cal.noStudents')}
              </p>
            )}
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: 'var(--sp-2)',
                color: 'var(--text-secondary)',
              }}
            >
              {t('trainings.cal.attendance')}
            </div>
            <div className="cal-attend-list">
              {m.groupRows.length ? (
                m.groupRows.map((row) => (
                  <RowItem
                    key={row.studentId}
                    row={row}
                    checkbox
                    checked={m.checked.has(row.studentId)}
                    onToggle={handleToggleAttendee(row.studentId)}
                  />
                ))
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {t('trainings.cal.noGroupStudents')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

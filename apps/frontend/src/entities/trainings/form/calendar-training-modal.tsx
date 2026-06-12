import { useState } from 'react'

import { Button, Dropdown, Modal } from 'antd'
import {
  CloseOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { Badge } from 'common/ui'
import { formatDateFull } from 'common/utils/date'
import { RenewSubModal } from 'entities/students/subscriptions/renew-sub-modal'

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
  gated,
  legacyWarn,
  onToggle,
  onRemove,
  onIssueSub,
}: {
  row: AttendRow
  checkbox: boolean
  checked?: boolean
  gated?: boolean
  legacyWarn?: boolean
  onToggle?: () => void
  onRemove?: () => void
  onIssueSub?: () => void
}) {
  const { t } = useTranslation()
  const handleIssueClick = (e: React.MouseEvent) => {
    // label вокруг строки переключил бы чекбокс — кнопка работает сама по себе
    e.preventDefault()
    e.stopPropagation()
    onIssueSub?.()
  }
  // Гейт: чекбокс заблокирован, любой тап по строке ведёт в оформление.
  const handleGatedRow =
    gated && onIssueSub
      ? (e: React.MouseEvent) => {
          e.preventDefault()
          onIssueSub()
        }
      : undefined
  return (
    <label
      className={`cal-attend-row${checked ? ' cal-attend-row--checked' : ''}${gated ? ' cal-attend-row--gated' : ''}`}
      onClick={handleGatedRow}
    >
      {checkbox && (
        <input type="checkbox" checked={!!checked} disabled={gated} onChange={onToggle} />
      )}
      <div className="cal-attend-info">
        <span className="cal-attend-name">{row.name}</span>
        {row.subLine && <span className="cal-attend-sub">{row.subLine}</span>}
        {legacyWarn && (
          <span className="cal-attend-warn">
            <ExclamationCircleOutlined /> {t('trainings.cal.markedNoSub')}
          </span>
        )}
      </div>
      <Badge variant={STATUS_VARIANT[row.status.type]}>{row.status.label}</Badge>
      {onIssueSub && (
        <Button size="small" onClick={handleIssueClick}>
          {t('trainings.cal.issueSub')}
        </Button>
      )}
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

  // Ученик, которому оформляется абонемент из строки отметки.
  const [issueFor, setIssueFor] = useState<AttendRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dateLabel = `${formatDateFull(block.date)}${block.time ? ` · ${block.time}` : ''}`

  const handleAddStudent = () => {
    if (m.training) {
      onClose()
      onAddStudent(m.training)
    }
  }
  // Отметить ученика без активного абонемента нельзя: чекбокс disabled, тап
  // по строке/кнопке открывает оформление; после успеха галочка ставится
  // (onCreated → toggle). Уже отмеченный без абонемента (легаси в данных) —
  // галочка остаётся, но с warning-индикатором.
  const needsSub = (row: AttendRow) =>
    row.status.type === 'none' || row.status.type === 'expired'
  const isGated = (row: AttendRow) => needsSub(row) && !m.checked.has(row.studentId)
  const isLegacyMarked = (row: AttendRow) => needsSub(row) && m.checked.has(row.studentId)
  const handleToggleAttendee = (row: AttendRow) => () => {
    if (isGated(row)) {
      setIssueFor(row)
      return
    }
    m.toggle(row.studentId)
  }
  const rowIssueHandler = (row: AttendRow) =>
    isGated(row) ? () => setIssueFor(row) : undefined

  const handleCloseIssue = () => setIssueFor(null)
  const handleIssued = () => {
    if (issueFor) m.toggle(issueFor.studentId)
  }
  const handleOpenConfirmDelete = () => setConfirmDelete(true)
  const handleCloseConfirmDelete = () => setConfirmDelete(false)

  const title = (
    <div className="cal-modal-head">
      <span className="cal-modal-head__title">{m.title}</span>
      {m.training && (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'delete',
                danger: true,
                label: t('trainings.cal.deleteTraining'),
                onClick: handleOpenConfirmDelete,
              },
            ],
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            aria-label={t('common.more')}
          />
        </Dropdown>
      )}
    </div>
  )

  const footer: React.ReactNode[] = []
  if (m.isInd) {
    footer.push(
      <Button
        key="add"
        icon={<PlusOutlined />}
        disabled={!m.training}
        onClick={handleAddStudent}
      >
        {t('trainings.cal.addStudentShort')}
      </Button>,
    )
  }
  if (m.training && onEdit) {
    footer.push(
      <Button
        key="edit"
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
    <Button
      key="save"
      className="tk-btn-primary"
      loading={m.saving}
      onClick={m.saveAttendance}
    >
      {t('common.save')}
    </Button>,
  )

  return (
    <>
      <Modal open={open} title={title} onCancel={onClose} footer={footer} destroyOnHidden>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--tk-text-secondary)' }}>{dateLabel}</div>

          {m.isInd ? (
            <div className="cal-attend-list">
              {m.indRows.length ? (
                m.indRows.map((row) => (
                  <RowItem
                    key={row.studentId}
                    row={row}
                    checkbox
                    checked={m.checked.has(row.studentId)}
                    gated={isGated(row)}
                    legacyWarn={isLegacyMarked(row)}
                    onToggle={handleToggleAttendee(row)}
                    onIssueSub={rowIssueHandler(row)}
                  />
                ))
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--tk-text-tertiary)' }}>
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
                  color: 'var(--tk-text-secondary)',
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
                      gated={isGated(row)}
                      legacyWarn={isLegacyMarked(row)}
                      onToggle={handleToggleAttendee(row)}
                      onIssueSub={rowIssueHandler(row)}
                    />
                  ))
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--tk-text-tertiary)' }}>
                    {t('trainings.cal.noGroupStudents')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={confirmDelete}
        title={t('trainings.cal.deleteTitle', { name: `${block.label} · ${block.time}` })}
        okText={t('common.delete')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true }}
        onOk={async () => {
          setConfirmDelete(false)
          await m.handleDelete()
        }}
        onCancel={handleCloseConfirmDelete}
      >
        {t('trainings.cal.deleteDescription')}
      </Modal>

      {issueFor && (
        <RenewSubModal
          open
          issueMode
          studentId={issueFor.studentId}
          studentName={issueFor.name}
          groupId={block.groupId}
          onCreated={handleIssued}
          onClose={handleCloseIssue}
        />
      )}
    </>
  )
}

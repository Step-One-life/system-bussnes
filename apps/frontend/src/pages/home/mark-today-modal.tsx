import { useEffect } from 'react'

import { Button, Checkbox, Modal } from 'antd'
import { CheckOutlined, ClockCircleOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { StatusBadge } from 'common/ui'
import { getSubStatus, subTypeLabel } from 'entities/students'

import { useMarkToday } from './use-mark-today'

import './mark-today-modal.scss'

interface MarkTodayModalProps {
  open: boolean
  onClose: () => void
}

export function MarkTodayModal({ open, onClose }: MarkTodayModalProps) {
  const { t } = useTranslation()
  const { todayGroups, students, checks, toggle, initChecks, save, saving } = useMarkToday(
    open,
    onClose,
  )

  useEffect(() => {
    if (open) initChecks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, todayGroups])

  const hasGroups = todayGroups.length > 0

  const handleToggle = (groupId: string, studentId: string) => () =>
    toggle(groupId, studentId)

  return (
    <Modal
      open={open}
      title={t('home.markTodayModal.title')}
      onCancel={onClose}
      footer={
        hasGroups
          ? [
              <Button
                key="save"
                className="btn-mark"
                type="primary"
                block
                loading={saving}
                onClick={save}
              >
                <CheckOutlined /> {t('home.markTodayModal.saveAttendance')}
              </Button>,
            ]
          : null
      }
    >
      {!hasGroups ? (
        <p className="mark-empty">{t('home.markTodayModal.nothingScheduled')}</p>
      ) : (
        <div className="mark-today">
          {todayGroups.map((tg) => {
            const grpStudents = students.filter((s) => s.groups.includes(tg.groupId))
            return (
              <div key={tg.groupId} className="mark-group">
                <div className="mark-group__head">
                  <span className="mark-group__name">{tg.groupId}</span>
                  {tg.time && (
                    <span className="mark-group__time">
                      <ClockCircleOutlined /> {tg.time}
                    </span>
                  )}
                </div>
                <div className="mark-group__list">
                  {grpStudents.length ? (
                    grpStudents.map((s) => {
                      const st = getSubStatus(s, tg.groupId)
                      const sub =
                        s.subscriptions.find(
                          (sb) => sb.groupId === tg.groupId && sb.isActive,
                        ) ?? null
                      const isSingle = sub?.type === '1' || sub?.type === '1_90'
                      const subLine = sub
                        ? isSingle
                          ? subTypeLabel(sub.type)
                          : `${subTypeLabel(sub.type)} · осталось ${sub.remaining}`
                        : ''
                      const checked = checks[tg.groupId]?.has(s.id) ?? false
                      return (
                        <label
                          key={s.id}
                          className={`mark-row${checked ? ' mark-row--checked' : ''}`}
                        >
                          <Checkbox
                            checked={checked}
                            onChange={handleToggle(tg.groupId, s.id)}
                          />
                          <div className="mark-row__info">
                            <span className="mark-row__name">{s.name}</span>
                            {subLine && <span className="mark-row__sub">{subLine}</span>}
                          </div>
                          <StatusBadge status={st} />
                        </label>
                      )
                    })
                  ) : (
                    <p className="mark-empty">{t('home.markTodayModal.noGroupStudents')}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

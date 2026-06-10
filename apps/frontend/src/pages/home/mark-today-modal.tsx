import { useEffect, useRef } from 'react'

import { Button, Checkbox, Modal } from 'antd'
import { CheckOutlined, ClockCircleOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { StatusBadge } from 'common/ui'
import { getSubStatus, subTypeLabel } from 'entities/students'

import { indKey, useMarkToday } from './use-mark-today'

import './mark-today-modal.scss'

interface MarkTodayModalProps {
  open: boolean
  onClose: () => void
}

export function MarkTodayModal({ open, onClose }: MarkTodayModalProps) {
  const { t } = useTranslation()
  const {
    todayGroups,
    todayIndividuals,
    students,
    checks,
    indChecks,
    toggle,
    toggleInd,
    initChecks,
    save,
    saving,
  } = useMarkToday(open, onClose)

  const inited = useRef(false)
  useEffect(() => {
    if (!open) {
      inited.current = false
      return
    }
    // Seed checkboxes once per open, after today's data is available — avoids
    // wiping the trainer's in-progress toggles when data refetches in the
    // background while the modal is open.
    if (!inited.current && (todayGroups.length > 0 || todayIndividuals.length > 0)) {
      initChecks()
      inited.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, todayGroups, todayIndividuals])

  const hasGroups = todayGroups.length > 0
  const hasContent = hasGroups || todayIndividuals.length > 0

  const handleToggle = (groupId: string, studentId: string) => () =>
    toggle(groupId, studentId)

  return (
    <Modal
      open={open}
      title={t('home.markTodayModal.title')}
      onCancel={onClose}
      footer={
        hasContent
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
      {!hasContent ? (
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

          {todayIndividuals.length > 0 && (
            <div className="mark-group">
              <div className="mark-group__head">
                <span className="mark-group__name">
                  {t('home.markTodayModal.individualSessions')}
                </span>
              </div>
              <div className="mark-group__list">
                {todayIndividuals.map((ti) => {
                  const student = students.find((s) => s.id === ti.studentId)
                  if (!student) return null
                  const st = getSubStatus(student, ti.groupId)
                  const sub =
                    student.subscriptions.find(
                      (sb) => sb.groupId === ti.groupId && sb.isActive,
                    ) ?? null
                  const isSingle = sub?.type === '1' || sub?.type === '1_90'
                  const subLine = sub
                    ? isSingle
                      ? subTypeLabel(sub.type)
                      : `${subTypeLabel(sub.type)} · осталось ${sub.remaining}`
                    : ''
                  const checked =
                    indChecks[indKey(ti.trainingId, ti.studentId)] ?? ti.originalPresent
                  return (
                    <label
                      key={indKey(ti.trainingId, ti.studentId)}
                      className={`mark-row${checked ? ' mark-row--checked' : ''}`}
                    >
                      <Checkbox
                        checked={checked}
                        onChange={() => toggleInd(ti.trainingId, ti.studentId)}
                      />
                      <div className="mark-row__info">
                        <span className="mark-row__name">{student.name}</span>
                        <span className="mark-row__sub">
                          {ti.time && (
                            <>
                              <ClockCircleOutlined /> {ti.time}
                              {subLine ? ' · ' : ''}
                            </>
                          )}
                          {subLine}
                        </span>
                      </div>
                      <StatusBadge status={st} />
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

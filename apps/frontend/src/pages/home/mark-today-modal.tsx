import { useEffect, useRef, useState } from 'react'

import { Button, Checkbox, Input, Modal } from 'antd'
import {
  CheckOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { StatusBadge } from 'common/ui'
import { getSubStatus, subTypeLabel } from 'entities/students'
import { RenewSubModal } from 'entities/students/subscriptions/renew-sub-modal'

import { indKey, useMarkToday } from './use-mark-today'

import type { ChangeEvent } from 'react'

import './mark-today-modal.scss'

/** Поиск появляется только на длинных списках — на коротких он шум. */
const SEARCH_MIN = 8

/** Ученик, которому оформляется абонемент из строки отметки. */
interface IssueTarget {
  studentId: string
  name: string
  groupId: string
  /** Есть только у индивидуальной строки — определяет, какой toggle звать. */
  trainingId?: string
}

/** Отметить без активного абонемента нельзя — тап ведёт в оформление. */
const needsSub = (type: string) => type === 'none' || type === 'expired'

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

  const [query, setQuery] = useState('')
  const [issueFor, setIssueFor] = useState<IssueTarget | null>(null)

  const inited = useRef(false)
  useEffect(() => {
    if (!open) {
      inited.current = false
      setQuery('')
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

  // Фильтр чисто визуальный: отметки живут в checks/indChecks и при поиске
  // не теряются. Группы без совпадений скрываются целиком.
  const q = query.trim().toLowerCase()
  const matches = (name: string) => !q || name.toLowerCase().includes(q)
  const grouped = todayGroups.map((tg) => ({
    tg,
    all: students.filter((s) => s.groups.includes(tg.groupId)),
  }))
  const visibleIndividuals = todayIndividuals.filter((ti) => {
    const st = students.find((s) => s.id === ti.studentId)
    return !!st && matches(st.name)
  })
  const totalRows =
    grouped.reduce((acc, g) => acc + g.all.length, 0) + todayIndividuals.length
  const showSearch = totalRows > SEARCH_MIN
  const anyVisible =
    grouped.some(({ all }) => all.some((s) => matches(s.name))) ||
    visibleIndividuals.length > 0

  const handleToggle = (groupId: string, studentId: string) => () =>
    toggle(groupId, studentId)
  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)

  // Гейт как в календарной модалке: клик по строке открывает оформление,
  // кнопка «Оформить» работает сама по себе (без переключения чекбокса).
  const handleGatedRow = (target: IssueTarget) => (e: React.MouseEvent) => {
    e.preventDefault()
    setIssueFor(target)
  }
  const handleIssueClick = (target: IssueTarget) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIssueFor(target)
  }
  const handleCloseIssue = () => setIssueFor(null)
  // Успешное оформление → галочка ставится сама (как onCreated → toggle в календаре).
  const handleIssued = () => {
    if (!issueFor) return
    if (issueFor.trainingId) toggleInd(issueFor.trainingId, issueFor.studentId)
    else toggle(issueFor.groupId, issueFor.studentId)
  }

  return (
    <>
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
          {showSearch && (
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t('students.filter.searchPlaceholder')}
              value={query}
              onChange={handleQueryChange}
            />
          )}
          {q && !anyVisible && <p className="mark-empty">{t('students.notFound')}</p>}
          {grouped.map(({ tg, all }) => {
            const grpStudents = all.filter((s) => matches(s.name))
            if (q && !grpStudents.length) return null
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
                          : `${subTypeLabel(sub.type)} · ${t('students.sub.remainingShort', { count: sub.remaining })}`
                        : ''
                      const checked = checks[tg.groupId]?.has(s.id) ?? false
                      const gated = needsSub(st.type) && !checked
                      const legacyWarn = needsSub(st.type) && checked
                      const target: IssueTarget = {
                        studentId: s.id,
                        name: s.name,
                        groupId: tg.groupId,
                      }
                      return (
                        <label
                          key={s.id}
                          className={`mark-row${checked ? ' mark-row--checked' : ''}${gated ? ' mark-row--gated' : ''}`}
                          onClick={gated ? handleGatedRow(target) : undefined}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={gated}
                            onChange={handleToggle(tg.groupId, s.id)}
                          />
                          <div className="mark-row__info">
                            <span className="mark-row__name">{s.name}</span>
                            {subLine && <span className="mark-row__sub">{subLine}</span>}
                            {legacyWarn && (
                              <span className="mark-row__warn">
                                <ExclamationCircleOutlined />{' '}
                                {t('trainings.cal.markedNoSub')}
                              </span>
                            )}
                          </div>
                          <StatusBadge status={st} />
                          {gated && (
                            <Button size="small" onClick={handleIssueClick(target)}>
                              {t('trainings.cal.issueSub')}
                            </Button>
                          )}
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

          {visibleIndividuals.length > 0 && (
            <div className="mark-group">
              <div className="mark-group__head">
                <span className="mark-group__name">
                  {t('home.markTodayModal.individualSessions')}
                </span>
              </div>
              <div className="mark-group__list">
                {visibleIndividuals.map((ti) => {
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
                      : `${subTypeLabel(sub.type)} · ${t('students.sub.remainingShort', { count: sub.remaining })}`
                    : ''
                  const checked =
                    indChecks[indKey(ti.trainingId, ti.studentId)] ?? ti.originalPresent
                  const gated = needsSub(st.type) && !checked
                  const legacyWarn = needsSub(st.type) && checked
                  const target: IssueTarget = {
                    studentId: ti.studentId,
                    name: student.name,
                    groupId: ti.groupId,
                    trainingId: ti.trainingId,
                  }
                  return (
                    <label
                      key={indKey(ti.trainingId, ti.studentId)}
                      className={`mark-row${checked ? ' mark-row--checked' : ''}${gated ? ' mark-row--gated' : ''}`}
                      onClick={gated ? handleGatedRow(target) : undefined}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={gated}
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
                        {legacyWarn && (
                          <span className="mark-row__warn">
                            <ExclamationCircleOutlined />{' '}
                            {t('trainings.cal.markedNoSub')}
                          </span>
                        )}
                      </div>
                      <StatusBadge status={st} />
                      {gated && (
                        <Button size="small" onClick={handleIssueClick(target)}>
                          {t('trainings.cal.issueSub')}
                        </Button>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>

    {issueFor && (
      <RenewSubModal
        open
        issueMode
        studentId={issueFor.studentId}
        studentName={issueFor.name}
        groupId={issueFor.groupId}
        onCreated={handleIssued}
        onClose={handleCloseIssue}
      />
    )}
    </>
  )
}

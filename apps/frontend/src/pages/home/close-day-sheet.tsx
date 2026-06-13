import { useEffect, useMemo, useRef, useState } from 'react'

import { Button, Checkbox } from 'antd'
import { CheckOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { AdaptiveSheet } from 'common/ui'
import { formatDateShort } from 'common/utils/date'
import { getSubStatus } from 'entities/students'

import { closeDaySummary, defaultGroupChecks, defaultIndChecks, indKey } from './day-marking-model'
import { QuickMarkSheet } from './quick-mark-sheet'
import { needsSub, useDayMarking } from './use-day-marking'

import type { QuickMarkTarget } from './quick-mark-sheet'
import type { MarkSelection } from './use-day-marking'

import './close-day-sheet.scss'

interface CloseDaySheetProps {
  open: boolean
  date: string
  onClose: () => void
}

interface Row {
  key: string
  label: string
  time: string
  alreadyMarked: boolean
  willMark: number
  target: QuickMarkTarget
  /** Дефолтный выбор строки — то, что сохранится при галочке «как запланировано». */
  groupChecks?: Set<string>
  indChecks?: Record<string, boolean>
}

export function CloseDaySheet({ open, date, onClose }: CloseDaySheetProps) {
  const { t } = useTranslation()
  const day = useDayMarking(open, onClose, date)
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set())
  const [expand, setExpand] = useState<QuickMarkTarget | null>(null)

  // Строки: занятие целиком + дефолт «как запланировано» из чистой модели.
  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const dg of day.dayGroups) {
      const members = day.students.filter((s) => s.groups.includes(dg.groupId))
      const def = defaultGroupChecks(
        { existing: dg.existing },
        members,
        (s) => !needsSub(getSubStatus(s, dg.groupId, dg.duration).type),
      )
      const willMark = [...def].filter((id) => !dg.originalAttendees.has(id)).length
      out.push({
        key: `g:${dg.groupId}`,
        label: dg.groupId,
        time: dg.time,
        alreadyMarked: dg.originalAttendees.size > 0,
        willMark,
        groupChecks: def,
        target: {
          groupId: dg.groupId,
          trainingId: dg.existing?.id ?? null,
          isInd: false,
          time: dg.time,
          label: dg.groupId,
          date,
        },
      })
    }
    // Инд./парные группируются по trainingId (у парного 2 строки слота → 1 занятие).
    const byTraining = new Map<string, typeof day.dayIndividuals>()
    for (const ti of day.dayIndividuals) {
      const arr = byTraining.get(ti.trainingId) ?? []
      arr.push(ti)
      byTraining.set(ti.trainingId, arr)
    }
    for (const [trainingId, slots] of byTraining) {
      const def = defaultIndChecks(slots, (slot) => {
        const st = day.students.find((s) => s.id === slot.studentId)
        return !!st && !needsSub(getSubStatus(st, slot.groupId).type)
      })
      const willMark = slots.filter(
        (s) => !s.originalPresent && def[indKey(s.trainingId, s.studentId)],
      ).length
      const names = slots
        .map((s) => day.students.find((st) => st.id === s.studentId)?.name ?? '')
        .filter(Boolean)
        .join(' + ')
      out.push({
        key: `t:${trainingId}`,
        label: names || t('home.indTraining'),
        time: slots[0]?.time ?? '',
        alreadyMarked: slots.every((s) => s.originalPresent),
        willMark,
        indChecks: def,
        target: {
          groupId: slots[0]?.groupId ?? '',
          trainingId,
          isInd: true,
          time: slots[0]?.time ?? '',
          label: names || t('home.indTraining'),
          date,
        },
      })
    }
    return out.sort((a, b) => a.time.localeCompare(b.time))
    // Точечные поля day достаточно: ссылаться на весь day — лишние пересчёты.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.dayGroups, day.dayIndividuals, day.students, date, t])

  // Сид галочек строк: один раз на открытие, по умолчанию все незакрытые включены.
  const inited = useRef(false)
  useEffect(() => {
    if (!open) {
      inited.current = false
      return
    }
    if (!inited.current && day.students.length > 0 && rows.length > 0) {
      setCheckedRows(
        new Set(rows.filter((r) => !r.alreadyMarked && r.willMark > 0).map((r) => r.key)),
      )
      inited.current = true
    }
  }, [open, day.students, rows])

  const toggleRow = (key: string) =>
    setCheckedRows((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const summary = closeDaySummary(rows, checkedRows)

  const handleSave = () => {
    // Явный выбор: только выбранные строки, их дефолтные участники.
    const selection: MarkSelection = { groups: {}, ind: {} }
    for (const r of rows) {
      if (r.alreadyMarked || !checkedRows.has(r.key)) continue
      if (r.groupChecks) selection.groups[r.target.groupId] = r.groupChecks
      if (r.indChecks) Object.assign(selection.ind, r.indChecks)
    }
    day.save(selection)
  }

  const handleExpand = (target: QuickMarkTarget) => () => setExpand(target)
  const handleRowKey = (target: QuickMarkTarget) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') setExpand(target)
  }
  const handleCheckClick = (e: React.MouseEvent) => e.stopPropagation()
  const handleToggleRow = (key: string) => () => toggleRow(key)
  const handleCloseExpand = () => setExpand(null)

  return (
    <>
      <AdaptiveSheet
        open={open}
        title={t('home.closeDayTitle', { date: formatDateShort(date) })}
        onClose={onClose}
        footer={
          rows.length > 0 ? (
            <div className="close-day__footer">
              <Button
                className="tk-btn-primary"
                type="primary"
                block
                loading={day.saving}
                disabled={summary.trainings === 0}
                onClick={handleSave}
              >
                <CheckOutlined /> {t('home.closeDayMarkAll')}
                {summary.trainings > 0 &&
                  ` · ${t('home.trainingsCount', { count: summary.trainings })}, ${t('home.peopleCount', { count: summary.students })}`}
              </Button>
              <div className="close-day__hint">{t('home.closeDayExpandHint')}</div>
            </div>
          ) : null
        }
      >
        {rows.length === 0 ? (
          <p className="mark-empty">{t('home.markTodayModal.nothingScheduled')}</p>
        ) : (
          <div className="close-day">
            {rows.map((r) => (
              <div
                role="button"
                tabIndex={0}
                key={r.key}
                className={`close-day__row${r.alreadyMarked ? ' close-day__row--done' : ''}`}
                onClick={handleExpand(r.target)}
                onKeyDown={handleRowKey(r.target)}
              >
                <span className="close-day__time tk-num">{r.time}</span>
                <span className="close-day__main">
                  <span className="close-day__name">{r.label}</span>
                  <span className="close-day__sub">
                    {r.alreadyMarked ? (
                      <>
                        <CheckOutlined /> {t('home.closeDayAlreadyMarked')}
                      </>
                    ) : r.willMark > 0 ? (
                      t('home.closeDayWillMark', { count: r.willMark })
                    ) : (
                      t('home.closeDayNobody')
                    )}
                  </span>
                </span>
                {!r.alreadyMarked && (
                  <Checkbox
                    checked={checkedRows.has(r.key)}
                    disabled={r.willMark === 0}
                    onClick={handleCheckClick}
                    onChange={handleToggleRow(r.key)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </AdaptiveSheet>
      <QuickMarkSheet target={expand} onClose={handleCloseExpand} />
    </>
  )
}

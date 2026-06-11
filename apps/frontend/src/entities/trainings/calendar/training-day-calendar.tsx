import { useEffect, useMemo, useRef } from 'react'

import { useTranslation } from 'react-i18next'

import { buildCalendarDay, DAY_H_PX, todayDateStr } from './calendar-model'

import type { Training } from '../model/types'
import type { CalendarBlock } from './calendar-model'
import type { Group } from 'entities/groups/model/types'
import type { Student } from 'entities/students/model/types'

import './training-day-calendar.scss'

interface TrainingDayCalendarProps {
  trainings: Training[]
  students: Student[]
  groups: Group[]
  onBlockClick: (block: CalendarBlock) => void
}

export function TrainingDayCalendar({
  trainings,
  students,
  groups,
  onBlockClick,
}: TrainingDayCalendarProps) {
  const { t } = useTranslation()
  const bodyRef = useRef<HTMLDivElement>(null)
  const date = todayDateStr()

  const { day, hStart, hEnd } = useMemo(
    () => buildCalendarDay(date, trainings, students, groups, undefined, DAY_H_PX),
    [date, trainings, students, groups],
  )

  const hours = useMemo(
    () => Array.from({ length: hEnd - hStart + 1 }, (_, i) => hStart + i),
    [hStart, hEnd],
  )
  const totalH = (hEnd - hStart) * DAY_H_PX

  // Start the day in view by scrolling to the earliest block. Snap to the
  // hour boundary so the hour label above the block isn't half-clipped.
  useEffect(() => {
    if (!bodyRef.current || !day.blocks.length) return
    const top = Math.min(...day.blocks.map((b) => b.topPx))
    bodyRef.current.scrollTop = Math.max(0, Math.floor(top / DAY_H_PX) * DAY_H_PX)
  }, [day.blocks])

  const handleBlockClick = (block: CalendarBlock) => () => onBlockClick(block)

  if (!day.blocks.length) {
    return <div className="home-empty-card">{t('home.noTrainingsToday')}</div>
  }

  return (
    <div className="cal-day">
      <div className="cal-day__body" ref={bodyRef}>
        <div className="cal-day__grid" style={{ height: totalH }}>
          <div className="cal-gutter" style={{ height: totalH }}>
            {hours.map((h, i) => (
              <div key={h} className="cal-gutter__label" style={{ top: i * DAY_H_PX }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          <div className="cal-col cal-col--today" style={{ height: totalH }}>
            {hours.map((h, i) => (
              <div key={h} className="cal-col__line" style={{ top: i * DAY_H_PX }} />
            ))}
            {day.blocks.map((b) => (
              <button
                key={b.key}
                className={`cal-block cal-block--${b.isInd ? 'ind' : 'group'}${
                  b.isScheduled ? ' cal-block--scheduled' : ''
                }`}
                style={{ top: b.topPx, height: b.heightPx }}
                // На коротких блоках подпись времени скрыта — тултип её заменяет.
                title={`${b.label} · ${b.time}`}
                onClick={handleBlockClick(b)}
              >
                <div className="cal-block__name">{b.label}</div>
                {b.heightPx >= 36 && (
                  <div className="cal-block__time">
                    {b.time}
                    {!b.isInd && b.attendeesCount > 0
                      ? ` · ${t('trainings.calendar.attendeesCount', { count: b.attendeesCount })}`
                      : ''}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'

import { Button } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import {
  buildCalendarWeek,
  CAL_H_END,
  CAL_H_PX,
  CAL_H_START,
  currentWeekStart,
  formatWeekRange,
} from './calendar-model'

import type { Training } from '../model/types'
import type { CalendarBlock } from './calendar-model'
import type { Group } from 'entities/groups/model/types'
import type { Student } from 'entities/students/model/types'

import './training-calendar.scss'

interface TrainingCalendarProps {
  trainings: Training[]
  students: Student[]
  groups: Group[]
  onBlockClick: (block: CalendarBlock) => void
}

const TOTAL_H = (CAL_H_END - CAL_H_START) * CAL_H_PX

export function TrainingCalendar({
  trainings,
  students,
  groups,
  onBlockClick,
}: TrainingCalendarProps) {
  const { t } = useTranslation()
  const [weekStart, setWeekStart] = useState(currentWeekStart)

  const days = useMemo(
    () => buildCalendarWeek(weekStart, trainings, students, groups),
    [weekStart, trainings, students, groups],
  )

  const shiftWeek = (delta: number) => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + delta)
      return d
    })
  }

  const hours = Array.from({ length: CAL_H_END - CAL_H_START + 1 }, (_, i) => CAL_H_START + i)

  const handlePrevWeek = () => shiftWeek(-7)
  const handleNextWeek = () => shiftWeek(7)
  const handleToday = () => setWeekStart(currentWeekStart())
  const handleBlockClick = (block: CalendarBlock) => () => onBlockClick(block)

  return (
    <div className="cal-week">
      <div className="cal-week__topbar">
        <div className="cal-week__nav">
          <Button size="small" type="text" icon={<LeftOutlined />} onClick={handlePrevWeek} />
          <span className="cal-week__label">{formatWeekRange(weekStart)}</span>
          <Button size="small" type="text" icon={<RightOutlined />} onClick={handleNextWeek} />
        </div>
        <Button size="small" onClick={handleToday}>
          {t('trainings.calendar.today')}
        </Button>
      </div>

      <div className="cal-week__canvas">
        <div className="cal-head">
          <div className="cal-head__corner" />
          {days.map((d) => (
            <div
              key={d.date}
              className={`cal-head__day${d.isToday ? ' cal-head__day--today' : ''}`}
            >
              <span className="cal-head__dow">{d.dayOfWeek}</span>
              <span className="cal-head__num">{d.dayLabel}</span>
            </div>
          ))}
        </div>
        <div className="cal-body-wrap">
          <div className="cal-body">
            <div className="cal-gutter" style={{ height: TOTAL_H }}>
              {hours.map((h, i) => (
                <div key={h} className="cal-gutter__label" style={{ top: i * CAL_H_PX }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {days.map((d) => (
              <div
                key={d.date}
                className={`cal-col${d.isToday ? ' cal-col--today' : ''}`}
                style={{ height: TOTAL_H }}
              >
                {hours.map((h, i) => (
                  <div key={h} className="cal-col__line" style={{ top: i * CAL_H_PX }} />
                ))}
                {d.blocks.map((b) => (
                  <button
                    key={b.key}
                    className={`cal-block cal-block--${b.isInd ? 'ind' : 'group'}${
                      b.isScheduled ? ' cal-block--scheduled' : ''
                    }`}
                    style={{ top: b.topPx, height: b.heightPx }}
                    onClick={handleBlockClick(b)}
                  >
                    <div className="cal-block__name">{b.label}</div>
                    {b.heightPx >= 40 && (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

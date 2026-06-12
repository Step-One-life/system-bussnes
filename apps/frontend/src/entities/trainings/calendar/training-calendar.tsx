import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import {
  buildCalendarWeek,
  CAL_H_PX,
  currentWeekStart,
  formatWeekRange,
  todayDateStr,
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
  weekStart: Date
  onWeekStartChange: (weekStart: Date) => void
  onBlockClick: (block: CalendarBlock) => void
}

function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function TrainingCalendar({
  trainings,
  students,
  groups,
  weekStart,
  onWeekStartChange,
  onBlockClick,
}: TrainingCalendarProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // «Сейчас» обновляется раз в минуту: двигает now-линию и переводит
  // завершившиеся занятия в приглушённый вид без перезагрузки страницы.
  const [nowMin, setNowMin] = useState(nowMinutes)
  useEffect(() => {
    const id = setInterval(() => setNowMin(nowMinutes()), 60_000)
    return () => clearInterval(id)
  }, [])

  const { days, hStart, hEnd } = useMemo(
    () => buildCalendarWeek(weekStart, trainings, students, groups),
    [weekStart, trainings, students, groups],
  )

  const totalH = (hEnd - hStart) * CAL_H_PX
  const hours = Array.from({ length: hEnd - hStart + 1 }, (_, i) => hStart + i)

  const todayStr = todayDateStr()
  const hasToday = days.some((d) => d.isToday)
  const nowTop = (nowMin - hStart * 60) * (CAL_H_PX / 60)
  const nowVisible = hasToday && nowTop >= 0 && nowTop <= totalH

  // При открытии текущей недели — автоскролл к линии времени (минус ~час,
  // чтобы был виден контекст перед «сейчас»).
  useEffect(() => {
    if (!nowVisible || !scrollRef.current) return
    scrollRef.current.scrollTop = Math.max(0, nowTop - CAL_H_PX)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, nowVisible])

  const isPastBlock = (b: CalendarBlock) =>
    b.date < todayStr || (b.date === todayStr && b.startMin + b.durMin <= nowMin)

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + delta)
    onWeekStartChange(d)
  }

  const handlePrevWeek = () => shiftWeek(-7)
  const handleNextWeek = () => shiftWeek(7)
  const handleToday = () => onWeekStartChange(currentWeekStart())
  const handleBlockClick = (block: CalendarBlock) => () => onBlockClick(block)

  return (
    <div className="cal-week">
      <div className="cal-week__topbar">
        <div className="cal-week__nav">
          <Button
            size="small"
            type="text"
            icon={<LeftOutlined />}
            aria-label={t('trainings.calendar.prevWeek')}
            onClick={handlePrevWeek}
          />
          <span className="cal-week__label">{formatWeekRange(weekStart)}</span>
          <Button
            size="small"
            type="text"
            icon={<RightOutlined />}
            aria-label={t('trainings.calendar.nextWeek')}
            onClick={handleNextWeek}
          />
        </div>
        <Button size="small" onClick={handleToday}>
          {t('trainings.calendar.today')}
        </Button>
      </div>

      <div className="cal-legend">
        <span className="cal-legend__item">
          <span className="cal-legend__chip cal-legend__chip--normal" />
          {t('trainings.calendar.legendNormal')}
        </span>
        <span className="cal-legend__item">
          <span className="cal-legend__chip cal-legend__chip--scheduled" />
          {t('trainings.calendar.legendScheduled')}
        </span>
        <span className="cal-legend__item">
          <span className="cal-legend__chip cal-legend__chip--past" />
          {t('trainings.calendar.legendPast')}
        </span>
      </div>

      <div className="cal-week__canvas">
        <div className="cal-week__scroll" ref={scrollRef}>
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
          <div className="cal-body">
            <div className="cal-gutter" style={{ height: totalH }}>
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
                style={{ height: totalH }}
              >
                {hours.map((h, i) => (
                  <div key={h} className="cal-col__line" style={{ top: i * CAL_H_PX }} />
                ))}
                {d.blocks.map((b) => (
                  <button
                    key={b.key}
                    className={`cal-block cal-block--${b.isInd ? 'ind' : 'group'}${
                      b.isScheduled ? ' cal-block--scheduled' : ''
                    }${isPastBlock(b) ? ' cal-block--past' : ''}`}
                    style={{ top: b.topPx, height: b.heightPx }}
                    // Тултип с полным названием: в блоке оно ограничено
                    // двумя строками, на коротких блоках скрыто и время.
                    title={`${b.label} · ${b.time}`}
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
                {d.isToday && nowVisible && (
                  <div className="cal-now" style={{ top: nowTop }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

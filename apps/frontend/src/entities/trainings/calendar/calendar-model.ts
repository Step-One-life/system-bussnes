import filter from 'lodash/filter'
import find from 'lodash/find'

import { getMondayOfWeek } from 'common/utils/date'

import { isIndividualTraining } from '../model/training-helpers'

import type { Training } from '../model/types'
import type { Group } from 'entities/groups/model/types'

export const CAL_H_START = 10
export const CAL_H_END = 22
export const CAL_H_PX = 60
/** Denser vertical scale for the compact home "today" widget. */
export const DAY_H_PX = 46

const DOW_IDX: Record<string, number> = {
  Пн: 0,
  Вт: 1,
  Ср: 2,
  Чт: 3,
  Пт: 4,
  Сб: 5,
  Вс: 6,
}

const DOW_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export interface CalendarBlock {
  key: string
  trainingId: string | null
  groupId: string
  date: string
  time: string
  label: string
  isInd: boolean
  /** Slot from the group schedule that has not been recorded as a training yet. */
  isScheduled: boolean
  attendeesCount: number
  topPx: number
  heightPx: number
}

export interface CalendarDay {
  date: string
  dayLabel: string
  dayOfWeek: string
  isToday: boolean
  blocks: CalendarBlock[]
}

/** A training or scheduled slot belonging to a single day, before layout. */
interface DayItem {
  training: Training | null
  groupId: string
  time: string
  groupDur: number
  isInd: boolean
  label: string
  /** Индивидуальное занятие серии, ещё не подтверждённое (не списано). */
  planned?: boolean
}

function toDateStr(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export function todayDateStr(): string {
  return toDateStr(new Date())
}

/** Monday-based weekday index (Пн=0 … Вс=6) for an ISO date string. */
function dayIndexOf(dateStr: string): number {
  return (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7
}

function makeBlock(
  item: DayItem,
  dateStr: string,
  hStart: number,
  hEnd: number,
  pxPerHour: number,
): CalendarBlock | null {
  const { training, groupId, time, groupDur, isInd, label, planned } = item
  if (!time) return null

  const [hh, mm] = time.split(':').map(Number)
  const topPx = (hh * 60 + (mm || 0) - hStart * 60) * (pxPerHour / 60)
  const totalH = (hEnd - hStart) * pxPerHour
  if (topPx < 0 || topPx >= totalH) return null

  const dur = training?.sessionDuration || groupDur || 60
  const heightPx = Math.max(24, dur * (pxPerHour / 60))

  return {
    key: `${training?.id ?? 'sched'}-${groupId}-${dateStr}-${time}`,
    trainingId: training?.id ?? null,
    groupId,
    date: dateStr,
    time,
    label,
    isInd,
    isScheduled: !training || !!planned,
    attendeesCount: training?.attendees.length ?? 0,
    topPx,
    heightPx,
  }
}

/** Recorded trainings plus not-yet-recorded scheduled slots for the given day. */
function collectDayItems(
  dateStr: string,
  trainings: Training[],
  students: { id: string; name: string }[],
  groups: Group[],
): DayItem[] {
  const dayIdx = dayIndexOf(dateStr)
  const trMap = new Map(trainings.map((t) => [`${t.groupId}|${t.date}`, t]))
  const items: DayItem[] = []

  for (const t of filter(trainings, (tr) => tr.date === dateStr)) {
    const isInd = isIndividualTraining(t.groupId, groups)
    const group = find(groups, (g) => g.name === t.groupId)
    // Запланированное (ещё не подтверждённое) занятие участников не имеет —
    // берём имя клиента из plannedStudentId.
    const planned = isInd && t.attendees.length === 0 && !!t.plannedStudentId
    const attendeeId = t.attendees[0] ?? t.plannedStudentId
    const nameById = (id: string | null) => find(students, (s) => s.id === id)?.name ?? '?'
    const label = t.isPair
      ? `${nameById(t.plannedStudentId)} + ${nameById(t.plannedStudentId2)}`
      : isInd
        ? nameById(attendeeId)
        : t.groupId
    items.push({
      training: t,
      groupId: t.groupId,
      time: t.time,
      groupDur: group?.duration ?? 60,
      isInd,
      label,
      planned,
    })
  }

  for (const g of groups) {
    if (g.isIndividual) continue
    for (const slot of g.schedule ?? []) {
      if (DOW_IDX[slot.day] !== dayIdx) continue
      if (trMap.has(`${g.name}|${dateStr}`)) continue
      items.push({
        training: null,
        groupId: g.name,
        time: slot.time,
        groupDur: g.duration ?? 60,
        isInd: false,
        label: g.name,
      })
    }
  }

  return items
}

/**
 * Hour range covering all day items, never narrower than the default window.
 * Lets a single-day view show trainings that fall outside 10:00–22:00.
 */
function dayHourRange(items: DayItem[]): [number, number] {
  let start = CAL_H_START
  let end = CAL_H_END
  for (const it of items) {
    if (!it.time) continue
    const [hh, mm] = it.time.split(':').map(Number)
    const startMin = hh * 60 + (mm || 0)
    const dur = it.training?.sessionDuration || it.groupDur || 60
    start = Math.min(start, Math.floor(startMin / 60))
    end = Math.max(end, Math.ceil((startMin + dur) / 60))
  }
  return [start, end]
}

/**
 * Build a single day with its laid-out blocks. When `range` is omitted the hour
 * window adapts to fit every block; pass an explicit range for a uniform grid.
 */
export function buildCalendarDay(
  dateStr: string,
  trainings: Training[],
  students: { id: string; name: string }[],
  groups: Group[],
  range?: [number, number],
  pxPerHour: number = CAL_H_PX,
): { day: CalendarDay; hStart: number; hEnd: number } {
  const items = collectDayItems(dateStr, trainings, students, groups)
  const [hStart, hEnd] = range ?? dayHourRange(items)
  const blocks = items
    .map((it) => makeBlock(it, dateStr, hStart, hEnd, pxPerHour))
    .filter((b): b is CalendarBlock => b !== null)
    .sort((a, b) => a.topPx - b.topPx)

  const d = new Date(dateStr + 'T00:00:00')
  return {
    day: {
      date: dateStr,
      dayLabel: String(d.getDate()),
      dayOfWeek: DOW_SHORT[dayIndexOf(dateStr)],
      isToday: dateStr === todayDateStr(),
      blocks,
    },
    hStart,
    hEnd,
  }
}

export function buildCalendarWeek(
  weekStart: Date,
  trainings: Training[],
  students: { id: string; name: string }[],
  groups: Group[],
): CalendarDay[] {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return d
  })

  return days.map(
    (d) =>
      buildCalendarDay(toDateStr(d), trainings, students, groups, [
        CAL_H_START,
        CAL_H_END,
      ]).day,
  )
}

export function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart)
  end.setDate(weekStart.getDate() + 6)
  const fmtStart = weekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const fmtEnd = end.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `${fmtStart} – ${fmtEnd}`
}

export function currentWeekStart(): Date {
  return getMondayOfWeek(new Date())
}

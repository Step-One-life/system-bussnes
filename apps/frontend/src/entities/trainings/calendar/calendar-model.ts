import filter from 'lodash/filter'
import find from 'lodash/find'

import { getMondayOfWeek } from 'common/utils/date'
import { WEEKDAY_ABBRS, weekdayShortLabel } from 'common/utils/weekdays'
import { isGroupActiveOn } from 'entities/groups/model/group-expiry'

import { isIndividualTraining } from '../model/training-helpers'

import type { Training } from '../model/types'
import type { Group } from 'entities/groups/model/types'

export const CAL_H_START = 10
export const CAL_H_END = 22
export const CAL_H_PX = 60

/* Базовое окно недельной сетки: 09:00–21:00; занятия за его пределами
   расширяют диапазон, а не выпадают из вида. */
export const CAL_WEEK_H_START = 9
export const CAL_WEEK_H_END = 21

const DOW_IDX: Record<string, number> = {
  Пн: 0,
  Вт: 1,
  Ср: 2,
  Чт: 3,
  Пт: 4,
  Сб: 5,
  Вс: 6,
}


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
  /** Начало и длительность в минутах от полуночи — для проверки «прошло ли». */
  startMin: number
  durMin: number
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
  const startMin = hh * 60 + (mm || 0)
  const topPx = (startMin - hStart * 60) * (pxPerHour / 60)
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
    startMin,
    durMin: dur,
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
    // Истёкшая группа не предлагает занятий по расписанию после срока годности
    // (фактические занятия-записи остаются — они идут из цикла trainings выше).
    if (!isGroupActiveOn(g.expiresAt, dateStr)) continue
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
 * Hour range covering all items, never narrower than the base window.
 * `padEndHours` добавляет запас после последнего занятия (если оно позже
 * базового конца) — чтобы вечерний блок не упирался в нижний край сетки.
 */
function hourRange(
  items: DayItem[],
  baseStart: number,
  baseEnd: number,
  padEndHours = 0,
): [number, number] {
  let start = baseStart
  let itemsEnd = 0
  for (const it of items) {
    if (!it.time) continue
    const [hh, mm] = it.time.split(':').map(Number)
    const startMin = hh * 60 + (mm || 0)
    const dur = it.training?.sessionDuration || it.groupDur || 60
    start = Math.min(start, Math.floor(startMin / 60))
    itemsEnd = Math.max(itemsEnd, Math.ceil((startMin + dur) / 60))
  }
  // сетка не уходит за полночь — занятие, кончающееся позже, упрётся в низ дня
  const end = Math.min(itemsEnd > baseEnd ? itemsEnd + padEndHours : baseEnd, 24)
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
  const [hStart, hEnd] = range ?? hourRange(items, CAL_H_START, CAL_H_END)
  const blocks = items
    .map((it) => makeBlock(it, dateStr, hStart, hEnd, pxPerHour))
    .filter((b): b is CalendarBlock => b !== null)
    .sort((a, b) => a.topPx - b.topPx)

  const d = new Date(dateStr + 'T00:00:00')
  return {
    day: {
      date: dateStr,
      dayLabel: String(d.getDate()),
      dayOfWeek: weekdayShortLabel(WEEKDAY_ABBRS[dayIndexOf(dateStr)]),
      isToday: dateStr === todayDateStr(),
      blocks,
    },
    hStart,
    hEnd,
  }
}

export interface CalendarWeek {
  days: CalendarDay[]
  hStart: number
  hEnd: number
}

export function buildCalendarWeek(
  weekStart: Date,
  trainings: Training[],
  students: { id: string; name: string }[],
  groups: Group[],
): CalendarWeek {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return toDateStr(d)
  })

  // Единый диапазон часов на всю неделю: базовое окно 09–21, растянутое
  // до самого раннего/позднего занятия недели (+1 ч снизу, чтобы позднее
  // занятие не обрезалось краем сетки).
  const allItems = dates.flatMap((d) => collectDayItems(d, trainings, students, groups))
  const [hStart, hEnd] = hourRange(allItems, CAL_WEEK_H_START, CAL_WEEK_H_END, 1)

  return {
    days: dates.map(
      (d) => buildCalendarDay(d, trainings, students, groups, [hStart, hEnd]).day,
    ),
    hStart,
    hEnd,
  }
}

/**
 * Один день для режима «День» (мобильный по умолчанию): то же базовое окно
 * 09–21 с запасом +1 ч, что и у недели, — переключение режимов не «прыгает».
 */
export function buildCalendarSingleDay(
  anchor: Date,
  trainings: Training[],
  students: { id: string; name: string }[],
  groups: Group[],
): CalendarWeek {
  const dateStr = toDateStr(anchor)
  const items = collectDayItems(dateStr, trainings, students, groups)
  const [hStart, hEnd] = hourRange(items, CAL_WEEK_H_START, CAL_WEEK_H_END, 1)
  return {
    days: [buildCalendarDay(dateStr, trainings, students, groups, [hStart, hEnd]).day],
    hStart,
    hEnd,
  }
}

export function formatDayLabel(d: Date): string {
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
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

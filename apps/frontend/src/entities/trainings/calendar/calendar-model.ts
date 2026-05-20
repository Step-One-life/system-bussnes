import filter from 'lodash/filter'
import find from 'lodash/find'

import { getMondayOfWeek } from 'common/utils/date'

import { isIndividualTraining } from '../model/training-helpers'

import type { Training } from '../model/types'
import type { Group } from 'entities/groups/model/types'

export const CAL_H_START = 10
export const CAL_H_END = 22
export const CAL_H_PX = 60

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

function toDateStr(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

function makeBlock(args: {
  training: Training | null
  groupId: string
  date: string
  time: string
  groupDur: number
  isInd: boolean
  label: string
}): CalendarBlock | null {
  const { training, groupId, date, time, groupDur, isInd, label } = args
  if (!time) return null

  const [hh, mm] = time.split(':').map(Number)
  const topPx = (hh * 60 + (mm || 0) - CAL_H_START * 60) * (CAL_H_PX / 60)
  const totalH = (CAL_H_END - CAL_H_START) * CAL_H_PX
  if (topPx < 0 || topPx >= totalH) return null

  const dur = training?.sessionDuration || groupDur || 60
  const heightPx = Math.max(26, dur * (CAL_H_PX / 60))

  return {
    key: `${training?.id ?? 'sched'}-${groupId}-${date}-${time}`,
    trainingId: training?.id ?? null,
    groupId,
    date,
    time,
    label,
    isInd,
    attendeesCount: training?.attendees.length ?? 0,
    topPx,
    heightPx,
  }
}

const DOW_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function buildCalendarWeek(
  weekStart: Date,
  trainings: Training[],
  students: { id: string; name: string }[],
  groups: Group[],
): CalendarDay[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const trMap = new Map(trainings.map((t) => [`${t.groupId}|${t.date}`, t]))

  return days.map((d, dayIdx) => {
    const dateStr = toDateStr(d)

    const dayRecorded = filter(trainings, (t) => t.date === dateStr)
    const blocks: CalendarBlock[] = []

    for (const t of dayRecorded) {
      const isInd = isIndividualTraining(t.groupId, groups)
      const group = find(groups, (g) => g.name === t.groupId)
      const label = isInd
        ? (find(students, (s) => s.id === t.attendees[0])?.name ?? '?')
        : t.groupId
      const block = makeBlock({
        training: t,
        groupId: t.groupId,
        date: dateStr,
        time: t.time,
        groupDur: group?.duration ?? 60,
        isInd,
        label,
      })
      if (block) blocks.push(block)
    }

    for (const g of groups) {
      if (g.isIndividual) continue
      for (const slot of g.schedule ?? []) {
        if (DOW_IDX[slot.day] !== dayIdx) continue
        if (trMap.has(`${g.name}|${dateStr}`)) continue
        const block = makeBlock({
          training: null,
          groupId: g.name,
          date: dateStr,
          time: slot.time,
          groupDur: g.duration ?? 60,
          isInd: false,
          label: g.name,
        })
        if (block) blocks.push(block)
      }
    }

    return {
      date: dateStr,
      dayLabel: String(d.getDate()),
      dayOfWeek: DOW_SHORT[dayIdx],
      isToday: d.getTime() === today.getTime(),
      blocks,
    }
  })
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

import type { ScheduleEntry } from '../model/types'

/** Эталонное время для авто-подстановки: последнее непустое время в расписании. */
export function referenceTime(schedule: ScheduleEntry[]): string {
  for (let i = schedule.length - 1; i >= 0; i--) {
    if (schedule[i].time) return schedule[i].time
  }
  return ''
}

/** Добавить день; новый день наследует эталонное время (если есть). */
export function addDay(schedule: ScheduleEntry[], abbr: string): ScheduleEntry[] {
  return [...schedule, { day: abbr, time: referenceTime(schedule) }]
}

/**
 * Установить время дню. Если время непустое — оно же проставляется всем
 * выбранным дням, у которых время ещё пустое. Дни с заданным временем не трогаются.
 */
export function setDayTime(
  schedule: ScheduleEntry[],
  abbr: string,
  time: string,
): ScheduleEntry[] {
  return schedule.map((e) => {
    if (e.day === abbr) return { ...e, time }
    if (time && !e.time) return { ...e, time }
    return e
  })
}

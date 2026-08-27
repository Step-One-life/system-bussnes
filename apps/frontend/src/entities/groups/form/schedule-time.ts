import type { ScheduleEntry } from '../model/types'

/** Время по умолчанию, если в расписании ещё нет ни одного заданного. */
export const DEFAULT_SCHEDULE_TIME = '18:00'

/** Дни, отмеченные без времени: такой слот не порождает занятий в календаре. */
export function daysWithoutTime(schedule: ScheduleEntry[]): string[] {
  return schedule.filter((e) => !e.time).map((e) => e.day)
}

/** Эталонное время для авто-подстановки: последнее непустое время в расписании. */
export function referenceTime(schedule: ScheduleEntry[]): string {
  for (let i = schedule.length - 1; i >= 0; i--) {
    if (schedule[i].time) return schedule[i].time
  }
  return ''
}

/**
 * Добавить день. Наследует эталонное время, а если задавать ещё нечего —
 * подставляет дефолт: день без времени молча выпадал из календаря и ленты
 * «Сегодня», хотя карточка группы показывала его в расписании.
 */
export function addDay(schedule: ScheduleEntry[], abbr: string): ScheduleEntry[] {
  return [...schedule, { day: abbr, time: referenceTime(schedule) || DEFAULT_SCHEDULE_TIME }]
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

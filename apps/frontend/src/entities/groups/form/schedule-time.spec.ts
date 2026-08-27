import { addDay, daysWithoutTime, DEFAULT_SCHEDULE_TIME, referenceTime, setDayTime } from './schedule-time'

import type { ScheduleEntry } from '../model/types'

import { describe, expect, it } from 'vitest'

describe('referenceTime', () => {
  it('пустой массив → пустая строка', () => {
    expect(referenceTime([])).toBe('')
  })

  it('все дни без времени → пустая строка', () => {
    const s: ScheduleEntry[] = [
      { day: 'Пн', time: '' },
      { day: 'Ср', time: '' },
    ]
    expect(referenceTime(s)).toBe('')
  })

  it('берёт ПОСЛЕДНЕЕ непустое время', () => {
    const s: ScheduleEntry[] = [
      { day: 'Пн', time: '20:00' },
      { day: 'Ср', time: '' },
      { day: 'Пт', time: '19:00' },
    ]
    expect(referenceTime(s)).toBe('19:00')
  })
})

describe('addDay', () => {
  // Поведение изменено осознанно (D19): пустое время означало день, который
  // молча не порождает занятий. Теперь подставляется дефолт.
  it('в пустое расписание добавляет день с дефолтным временем', () => {
    expect(addDay([], 'Пн')).toEqual([{ day: 'Пн', time: DEFAULT_SCHEDULE_TIME }])
  })

  it('новый день наследует эталонное время', () => {
    const s: ScheduleEntry[] = [{ day: 'Пн', time: '20:00' }]
    expect(addDay(s, 'Ср')).toEqual([
      { day: 'Пн', time: '20:00' },
      { day: 'Ср', time: '20:00' },
    ])
  })
})

describe('setDayTime', () => {
  it('ставит время целевому дню', () => {
    const s: ScheduleEntry[] = [{ day: 'Пн', time: '' }]
    expect(setDayTime(s, 'Пн', '20:00')).toEqual([{ day: 'Пн', time: '20:00' }])
  })

  it('заполняет только пустые дни', () => {
    const s: ScheduleEntry[] = [
      { day: 'Пн', time: '' },
      { day: 'Ср', time: '' },
    ]
    expect(setDayTime(s, 'Пн', '20:00')).toEqual([
      { day: 'Пн', time: '20:00' },
      { day: 'Ср', time: '20:00' },
    ])
  })

  it('НЕ перетирает день с уже заданным другим временем', () => {
    const s: ScheduleEntry[] = [
      { day: 'Пн', time: '20:00' },
      { day: 'Ср', time: '19:00' },
      { day: 'Пт', time: '' },
    ]
    expect(setDayTime(s, 'Пн', '21:00')).toEqual([
      { day: 'Пн', time: '21:00' },
      { day: 'Ср', time: '19:00' },
      { day: 'Пт', time: '21:00' },
    ])
  })

  it('очистка времени (пустая строка) не трогает чужие дни', () => {
    const s: ScheduleEntry[] = [
      { day: 'Пн', time: '20:00' },
      { day: 'Ср', time: '20:00' },
    ]
    expect(setDayTime(s, 'Пн', '')).toEqual([
      { day: 'Пн', time: '' },
      { day: 'Ср', time: '20:00' },
    ])
  })
})

// D19: день без времени молча выпадал из календаря и ленты «Сегодня»,
// хотя карточка группы показывала его в расписании.
describe('день без времени', () => {
  it('первый отмеченный день получает дефолтное время, а не пустоту', () => {
    expect(addDay([], 'Пн')).toEqual([{ day: 'Пн', time: DEFAULT_SCHEDULE_TIME }])
  })

  it('следующий день по-прежнему наследует уже заданное время', () => {
    expect(addDay([{ day: 'Пн', time: '20:00' }], 'Ср')).toEqual([
      { day: 'Пн', time: '20:00' },
      { day: 'Ср', time: '20:00' },
    ])
  })

  it('daysWithoutTime находит дни, которые тренер очистил вручную', () => {
    const schedule = [
      { day: 'Пн', time: '20:00' },
      { day: 'Ср', time: '' },
      { day: 'Пт', time: '' },
    ]
    expect(daysWithoutTime(schedule)).toEqual(['Ср', 'Пт'])
  })

  it('полное расписание — пустой список нарушений', () => {
    expect(daysWithoutTime([{ day: 'Пн', time: '20:00' }])).toEqual([])
  })
})

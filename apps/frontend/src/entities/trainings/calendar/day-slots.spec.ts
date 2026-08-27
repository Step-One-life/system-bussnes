import { buildCalendarDay } from './calendar-model'

import type { Training } from '../model/types'
import type { Group } from 'entities/groups/model/types'

import { describe, expect, it } from 'vitest'

// 2026-08-31 — понедельник
const MONDAY = '2026-08-31'

const group = (over: Partial<Group> = {}): Group =>
  ({
    id: 'g1',
    name: 'Старт',
    isIndividual: false,
    duration: 60,
    locationId: null,
    expiresAt: null,
    schedule: [{ day: 'Пн', time: '10:00' }],
    ...over,
  }) as Group

let seq = 0
const training = (over: Partial<Training> = {}): Training => {
  seq += 1
  return {
    id: `tr-${seq}`,
    date: MONDAY,
    time: '18:00',
    groupId: 'Старт',
    locationId: null,
    attendees: [],
    note: '',
    isPrime: false,
    isOnline: false,
    sessionDuration: 60,
    recurring: false,
    recurringId: null,
    plannedStudentId: null,
    isPair: false,
    plannedStudentId2: null,
    createdAt: '2026-08-01',
    ...over,
  } as Training
}

const times = (trainings: Training[]) =>
  buildCalendarDay(MONDAY, trainings, [], [group()]).day.blocks.map((b) => b.time).sort()

// D9: слот подавлялся ключом «группа|дата» без сверки времени, поэтому
// дополнительное занятие на 18:00 стирало из календаря сам слот 10:00.
describe('слоты расписания и дополнительные занятия', () => {
  it('пустой день показывает слот расписания', () => {
    expect(times([])).toEqual(['10:00'])
  })

  it('дополнительное занятие на другое время НЕ съедает слот расписания', () => {
    expect(times([training({ time: '18:00' })])).toEqual(['10:00', '18:00'])
  })

  it('занятие в то же время подавляет слот — дубля нет', () => {
    expect(times([training({ time: '10:00' })])).toEqual(['10:00'])
  })

  it('два дополнительных занятия и слот — три строки', () => {
    expect(times([training({ time: '18:00' }), training({ time: '20:00' })])).toEqual([
      '10:00',
      '18:00',
      '20:00',
    ])
  })
})

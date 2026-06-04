import { buildEventResource, computeEndTime } from './event-builder'

describe('computeEndTime', () => {
  it('прибавляет длительность к времени начала', () => {
    expect(computeEndTime('2026-06-04', '18:00', 90)).toEqual({
      date: '2026-06-04',
      time: '19:30',
    })
  })

  it('переносит дату при переходе через полночь', () => {
    expect(computeEndTime('2026-06-04', '23:30', 60)).toEqual({
      date: '2026-06-05',
      time: '00:30',
    })
  })
})

describe('buildEventResource', () => {
  it('групповая: заголовок = название группы, время в нужном поясе', () => {
    const ev = buildEventResource({
      eventId: 'abc',
      groupName: 'Трикинг',
      studentName: null,
      date: '2026-06-04',
      time: '18:00',
      durationMin: 60,
      locationName: 'Зал №1',
      locationAddress: 'ул. Спортивная, 1',
      note: 'разминка',
      isOnline: false,
      isPrime: true,
      trainingId: 'tid',
      timeZone: 'Europe/Moscow',
    })
    expect(ev.id).toBe('abc')
    expect(ev.summary).toBe('Трикинг')
    expect(ev.start).toEqual({ dateTime: '2026-06-04T18:00:00', timeZone: 'Europe/Moscow' })
    expect(ev.end).toEqual({ dateTime: '2026-06-04T19:00:00', timeZone: 'Europe/Moscow' })
    expect(ev.location).toContain('Зал №1')
    expect(ev.extendedProperties?.private?.trainingId).toBe('tid')
  })

  it('индивидуальная: заголовок = имя ученика; онлайн помечается в месте', () => {
    const ev = buildEventResource({
      eventId: 'abc',
      groupName: 'Индивидуальные',
      studentName: 'Иван Петров',
      date: '2026-06-04',
      time: '10:00',
      durationMin: 60,
      locationName: null,
      locationAddress: null,
      note: '',
      isOnline: true,
      isPrime: false,
      trainingId: 'tid',
      timeZone: 'Europe/Moscow',
    })
    expect(ev.summary).toBe('Иван Петров')
    expect(ev.location).toBe('Онлайн')
  })
})

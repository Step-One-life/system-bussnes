import { findOverlaps, type ExistingTraining } from './training-overlap'

const ex = (id: string, date: string, time: string, dur = 60): ExistingTraining => ({
  id,
  date,
  time,
  sessionDuration: dur,
})

describe('findOverlaps', () => {
  it('находит пересечение по времени в один день', () => {
    const out = findOverlaps(
      { date: '2026-06-09', time: '18:30', durationMinutes: 60 },
      [ex('a', '2026-06-09', '18:00', 60)],
    )
    expect(out.map((t) => t.id)).toEqual(['a'])
  })

  it('смежные интервалы не пересекаются (конец = начало)', () => {
    const out = findOverlaps(
      { date: '2026-06-09', time: '19:00', durationMinutes: 60 },
      [ex('a', '2026-06-09', '18:00', 60)],
    )
    expect(out).toEqual([])
  })

  it('разные дни не пересекаются', () => {
    const out = findOverlaps(
      { date: '2026-06-10', time: '18:00', durationMinutes: 60 },
      [ex('a', '2026-06-09', '18:00', 60)],
    )
    expect(out).toEqual([])
  })

  it('занятия без времени игнорируются (обе стороны)', () => {
    expect(
      findOverlaps({ date: '2026-06-09', time: '', durationMinutes: 60 }, [
        ex('a', '2026-06-09', '18:00'),
      ]),
    ).toEqual([])
    expect(
      findOverlaps({ date: '2026-06-09', time: '18:00', durationMinutes: 60 }, [
        ex('a', '2026-06-09', ''),
      ]),
    ).toEqual([])
  })

  it('исключает занятия из excludeIds (своя серия)', () => {
    const out = findOverlaps(
      { date: '2026-06-09', time: '18:00', durationMinutes: 60 },
      [ex('self', '2026-06-09', '18:00'), ex('other', '2026-06-09', '18:30')],
      ['self'],
    )
    expect(out.map((t) => t.id)).toEqual(['other'])
  })

  it('учитывает длительность 90 минут', () => {
    const out = findOverlaps(
      { date: '2026-06-09', time: '17:30', durationMinutes: 90 },
      [ex('a', '2026-06-09', '18:45', 60)],
    )
    expect(out.map((t) => t.id)).toEqual(['a'])
  })
})

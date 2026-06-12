import {
  findOverlaps,
  scheduleSlotsForDate,
  type ExistingTraining,
  type ScheduleGroupInfo,
} from './training-overlap'

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

// 2026-06-16 — вторник
const grp = (
  id: string,
  schedule: { day: string; time: string }[],
  over: Partial<ScheduleGroupInfo> = {},
): ScheduleGroupInfo => ({
  id,
  name: id,
  duration: 60,
  isIndividual: false,
  schedule,
  ...over,
})

describe('scheduleSlotsForDate', () => {
  it('слот группы в день недели даты становится кандидатом с длительностью группы', () => {
    const out = scheduleSlotsForDate(
      '2026-06-16',
      [grp('тхэквондо', [{ day: 'Вт', time: '17:30' }], { duration: 90 })],
      [],
    )
    expect(out).toEqual([
      { id: 'sched:тхэквондо:17:30', date: '2026-06-16', time: '17:30', sessionDuration: 90 },
    ])
  })

  it('слоты других дней недели не попадают', () => {
    const out = scheduleSlotsForDate(
      '2026-06-16',
      [grp('тхэквондо', [{ day: 'Ср', time: '17:30' }])],
      [],
    )
    expect(out).toEqual([])
  })

  it('группа с записанной тренировкой на эту дату пропускается (реальная запись уже в проверке)', () => {
    const out = scheduleSlotsForDate(
      '2026-06-16',
      [grp('тхэквондо', [{ day: 'Вт', time: '17:30' }])],
      ['тхэквондо'],
    )
    expect(out).toEqual([])
  })

  it('группа самого кандидата исключается (отметка своего же слота)', () => {
    const out = scheduleSlotsForDate(
      '2026-06-16',
      [grp('тхэквондо', [{ day: 'Вт', time: '17:30' }])],
      [],
      'тхэквондо',
    )
    expect(out).toEqual([])
  })

  it('индивидуальные группы пропускаются (их план — реальные записи)', () => {
    const out = scheduleSlotsForDate(
      '2026-06-16',
      [grp('инд', [{ day: 'Вт', time: '17:30' }], { isIndividual: true })],
      [],
    )
    expect(out).toEqual([])
  })

  it('слот без времени игнорируется', () => {
    const out = scheduleSlotsForDate('2026-06-16', [grp('г', [{ day: 'Вт', time: '' }])], [])
    expect(out).toEqual([])
  })
})

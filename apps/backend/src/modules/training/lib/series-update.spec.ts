import {
  seriesForbiddenFields,
  seriesTargets,
  seriesUpdateFields,
  shiftDateISO,
} from './series-update'

describe('seriesUpdateFields', () => {
  it('берёт только распространяемые поля', () => {
    expect(
      seriesUpdateFields({ time: '19:30', locationId: 'L1', note: 'x', isOnline: true }),
    ).toEqual({ time: '19:30', locationId: 'L1', note: 'x', isOnline: true })
  })

  it('НЕ распространяет дату, группу, состав и прайм на серию', () => {
    const out = seriesUpdateFields({
      time: '19:30',
      date: '2026-06-09',
      groupId: 'g',
      isPrime: true,
    } as never)
    expect(out).toEqual({ time: '19:30' })
    expect('date' in out).toBe(false)
    expect('isPrime' in out).toBe(false)
  })

  it('пропускает поля, которых нет в dto', () => {
    expect(seriesUpdateFields({ note: 'только заметка' })).toEqual({ note: 'только заметка' })
  })
})

describe('seriesForbiddenFields', () => {
  it('пустой список для распространяемых полей (вкл. dateShiftDays)', () => {
    expect(
      seriesForbiddenFields({
        time: '19:30',
        locationId: null,
        note: '',
        isOnline: false,
        dateShiftDays: 7,
      }),
    ).toEqual([])
  })

  it('называет groupId и абсолютную date — серия их не редактирует', () => {
    expect(seriesForbiddenFields({ groupId: 'g', date: '2026-06-09' })).toEqual([
      'groupId',
      'date',
    ])
  })

  it('игнорирует isPrime — он пересчитывается по каждому занятию', () => {
    expect(seriesForbiddenFields({ isPrime: true })).toEqual([])
  })
})

describe('shiftDateISO', () => {
  it('сдвигает вперёд через границу месяца', () => {
    expect(shiftDateISO('2026-09-07', 1)).toBe('2026-09-08')
    expect(shiftDateISO('2026-09-30', 1)).toBe('2026-10-01')
  })

  it('сдвигает назад и через границу года', () => {
    expect(shiftDateISO('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('сдвиг на 0 — дата без изменений', () => {
    expect(shiftDateISO('2026-09-07', 0)).toBe('2026-09-07')
  })

  it('учитывает високосный февраль', () => {
    expect(shiftDateISO('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('seriesTargets', () => {
  const occ = (date: string, time: string) => ({ date, time })

  it('без сдвига и без смены времени — moved=false у всех', () => {
    const occs = [occ('2026-09-07', '20:00'), occ('2026-09-14', '20:00')]
    const res = seriesTargets(occs, undefined, 0)
    expect(res.map((r) => [r.date, r.time, r.moved])).toEqual([
      ['2026-09-07', '20:00', false],
      ['2026-09-14', '20:00', false],
    ])
  })

  it('сдвиг дней двигает дату всех занятий, moved=true', () => {
    const occs = [occ('2026-09-07', '20:00'), occ('2026-09-14', '20:00')]
    const res = seriesTargets(occs, undefined, 1)
    expect(res.map((r) => [r.date, r.moved])).toEqual([
      ['2026-09-08', true],
      ['2026-09-15', true],
    ])
  })

  it('смена времени без сдвига даты: moved только у занятий с другим временем', () => {
    const occs = [occ('2026-09-07', '20:00'), occ('2026-09-14', '19:00')]
    const res = seriesTargets(occs, '20:00', 0)
    expect(res.map((r) => [r.time, r.moved])).toEqual([
      ['20:00', false],
      ['20:00', true],
    ])
  })

  it('сдвиг даты + смена времени: дата и время у всех новые, moved=true', () => {
    const res = seriesTargets([occ('2026-09-07', '20:00')], '19:00', 7)
    expect(res[0]).toEqual({
      occ: { date: '2026-09-07', time: '20:00' },
      date: '2026-09-14',
      time: '19:00',
      moved: true,
    })
  })
})

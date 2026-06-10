import { seriesForbiddenFields, seriesUpdateFields } from './series-update'

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
  it('пустой список для распространяемых полей', () => {
    expect(
      seriesForbiddenFields({ time: '19:30', locationId: null, note: '', isOnline: false }),
    ).toEqual([])
  })

  it('называет groupId и date — серия их не редактирует', () => {
    expect(seriesForbiddenFields({ groupId: 'g', date: '2026-06-09' })).toEqual([
      'groupId',
      'date',
    ])
  })

  it('игнорирует isPrime — он пересчитывается по каждому занятию', () => {
    expect(seriesForbiddenFields({ isPrime: true })).toEqual([])
  })
})

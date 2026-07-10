import { buildCsv, csvCell } from './csv'

import { describe, expect, it } from 'vitest'

describe('csvCell', () => {
  it('простые значения без изменений, null/undefined — пусто', () => {
    expect(csvCell('Анна')).toBe('Анна')
    expect(csvCell(1500)).toBe('1500')
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })

  it('экранирует разделитель, кавычки и переводы строк', () => {
    expect(csvCell('Группа; дети')).toBe('"Группа; дети"')
    expect(csvCell('Он сказал "да"')).toBe('"Он сказал ""да"""')
    expect(csvCell('две\nстроки')).toBe('"две\nстроки"')
  })
})

describe('buildCsv', () => {
  it('BOM + «;» + CRLF', () => {
    const csv = buildCsv([
      ['Дата', 'Сумма'],
      ['2026-07-03', 1500],
    ])
    expect(csv).toBe('\ufeffДата;Сумма\r\n2026-07-03;1500')
  })
})

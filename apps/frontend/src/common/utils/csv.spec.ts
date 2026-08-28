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

// D35: русский Excel не суммирует дробные с точкой, а значение с «=»
// исполняет как формулу — в колонки идут имена учеников и групп.
describe('csvCell — Excel', () => {
  it('целые числа как есть', () => {
    expect(csvCell(1500)).toBe('1500')
  })

  it('дробные — с запятой и в кавычках', () => {
    expect(csvCell(1500.5)).toBe('"1500,5"')
  })

  it('формульные префиксы обезвреживаются апострофом', () => {
    expect(csvCell('=1+1')).toBe("'=1+1")
    expect(csvCell('+7 999')).toBe("'+7 999")
    expect(csvCell('-Аня')).toBe("'-Аня")
    expect(csvCell('@group')).toBe("'@group")
  })

  it('обычное имя не трогается', () => {
    expect(csvCell('Аня Иванова')).toBe('Аня Иванова')
  })
})

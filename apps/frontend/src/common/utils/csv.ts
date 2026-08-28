/**
 * CSV для Excel: разделитель «;» (русская локаль Excel), строки CRLF,
 * BOM в начале — иначе Excel читает UTF-8 как кракозябры.
 */

export type CsvValue = string | number | null | undefined

/** Символы, с которых Excel начинает исполнять ячейку как формулу. */
const FORMULA_START = /^[=+\-@\t\r]/

/**
 * Ячейка CSV.
 * - Числа с дробной частью переводим в запятую: с точкой русский Excel
 *   импортирует их текстом, и колонка не суммируется.
 * - Значения, начинающиеся с «=», «+», «-», «@», префиксуем апострофом:
 *   иначе Excel исполнит их как формулу (в колонки идут имена учеников и групп).
 * - Кавычки удваиваются; «;», кавычки и переводы строк — в кавычки.
 */
export function csvCell(v: CsvValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : `"${String(v).replace('.', ',')}"`
  }
  const raw = FORMULA_START.test(v) ? `'${v}` : v
  return /[";\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

export function buildCsv(rows: CsvValue[][]): string {
  return '\ufeff' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n')
}

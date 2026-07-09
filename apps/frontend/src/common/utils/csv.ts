/**
 * CSV для Excel: разделитель «;» (русская локаль Excel), строки CRLF,
 * BOM в начале — иначе Excel читает UTF-8 как кракозябры.
 */

export type CsvValue = string | number | null | undefined

/** Ячейка: кавычки удваиваются; «;», кавычки и переводы строк — в кавычки. */
export function csvCell(v: CsvValue): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(rows: CsvValue[][]): string {
  return `﻿${rows.map((r) => r.map(csvCell).join(';')).join('\r\n')}`
}

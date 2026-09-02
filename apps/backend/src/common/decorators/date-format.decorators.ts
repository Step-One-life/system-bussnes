import { registerDecorator } from 'class-validator'
import type { ValidationOptions } from 'class-validator'

/** Строго календарная дата YYYY-MM-DD (без времени и зоны). */
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
/** Время суток HH:mm, 00:00–23:59. */
export const HH_MM_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Дата — реальная и в формате YYYY-MM-DD. Голый @IsString() пропускал
 * '2026-13-45' и '2026-09-20T10:00:00Z' в DATEONLY-колонку: MySQL молча
 * приводил такое к NULL/нулевой дате, а календарь получал занятие «без дня».
 * @IsDateString() тоже не годится: он принимает полный ISO с временем и зоной,
 * и полночь по UTC превращается в другой день по МСК.
 */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function IsIsoDate(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isIsoDate',
      target: target.constructor,
      propertyName,
      options: {
        message: `${propertyName} должно быть датой в формате YYYY-MM-DD`,
        ...options,
      },
      validator: { validate: isIsoDate },
    })
  }
}

/** Время HH:mm — '99:99' и 'abc' ломали расчёт наложений и сетку календаря. */
export function IsHHmm(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isHHmm',
      target: target.constructor,
      propertyName,
      options: {
        message: `${propertyName} должно быть временем в формате HH:mm`,
        ...options,
      },
      validator: { validate: (value: unknown) => typeof value === 'string' && HH_MM_RE.test(value) },
    })
  }
}

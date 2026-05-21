import find from 'lodash/find'

import { getDefaultLocation } from 'entities/locations'

import { getPricingRules } from '../model/finance.repo'

import type {
  ClientPaymentType,
  LessonKind,
  PricingFormat,
  PricingRule,
} from '../model/types'

/** Кортеж, однозначно определяющий тариф внутри локации. */
export interface RuleTuple {
  lessonKind: LessonKind
  format: PricingFormat
  durationMinutes: number
  sessionsCount: number
}

type SubType = '1' | '4' | '8' | '1_90' | '4_90' | '8_90'

/**
 * Маппинг типа абонемента ученика на кортеж тарифа (см. §4 плана).
 * '1' для группового занятия даёт group/single/60/1.
 */
export function subTypeToTuple(subType: SubType, isIndividual: boolean): RuleTuple {
  const lessonKind: LessonKind = isIndividual ? 'individual' : 'group'
  switch (subType) {
    case '1':
      return { lessonKind, format: 'single', durationMinutes: 60, sessionsCount: 1 }
    case '4':
      return { lessonKind, format: 'subscription', durationMinutes: 60, sessionsCount: 4 }
    case '8':
      return { lessonKind, format: 'subscription', durationMinutes: 60, sessionsCount: 8 }
    case '1_90':
      return {
        lessonKind: 'individual',
        format: 'single',
        durationMinutes: 90,
        sessionsCount: 1,
      }
    case '4_90':
      return {
        lessonKind: 'individual',
        format: 'subscription',
        durationMinutes: 90,
        sessionsCount: 4,
      }
    case '8_90':
      return {
        lessonKind: 'individual',
        format: 'subscription',
        durationMinutes: 90,
        sessionsCount: 8,
      }
  }
}

/** Маппинг типа платежа (доход/расход) на кортеж тарифа. */
export function clientTypeToTuple(type: ClientPaymentType): RuleTuple {
  switch (type) {
    case 'single_individual':
      return {
        lessonKind: 'individual',
        format: 'single',
        durationMinutes: 60,
        sessionsCount: 1,
      }
    case 'single_group':
      return { lessonKind: 'group', format: 'single', durationMinutes: 60, sessionsCount: 1 }
    case 'individual_sub_4':
      return {
        lessonKind: 'individual',
        format: 'subscription',
        durationMinutes: 60,
        sessionsCount: 4,
      }
    case 'group_sub_4':
      return {
        lessonKind: 'group',
        format: 'subscription',
        durationMinutes: 60,
        sessionsCount: 4,
      }
    case 'individual_sub_8':
      return {
        lessonKind: 'individual',
        format: 'subscription',
        durationMinutes: 60,
        sessionsCount: 8,
      }
    case 'group_sub_8':
      return {
        lessonKind: 'group',
        format: 'subscription',
        durationMinutes: 60,
        sessionsCount: 8,
      }
    case 'single_individual_90':
      return {
        lessonKind: 'individual',
        format: 'single',
        durationMinutes: 90,
        sessionsCount: 1,
      }
    case 'individual_sub_4_90':
      return {
        lessonKind: 'individual',
        format: 'subscription',
        durationMinutes: 90,
        sessionsCount: 4,
      }
    case 'individual_sub_8_90':
      return {
        lessonKind: 'individual',
        format: 'subscription',
        durationMinutes: 90,
        sessionsCount: 8,
      }
  }
}

/** Находит тариф по кортежу среди списка правил. */
export function matchRule(rules: PricingRule[], tuple: RuleTuple): PricingRule | null {
  return (
    find(
      rules,
      (r) =>
        r.lesson_kind === tuple.lessonKind &&
        r.format === tuple.format &&
        r.duration_minutes === tuple.durationMinutes &&
        r.sessions_count === tuple.sessionsCount,
    ) ?? null
  )
}

/**
 * Резолвит тариф для абонемента: берёт локацию (или дефолтную, если не задана)
 * и ищет в её тарифах строку по кортежу. Нет тарифа — null.
 */
export async function resolvePricingRule(
  locationId: string | null,
  tuple: RuleTuple,
): Promise<{ rule: PricingRule | null; locationId: string | null }> {
  let effectiveLocationId = locationId
  if (!effectiveLocationId) {
    const def = await getDefaultLocation()
    effectiveLocationId = def?.id ?? null
  }
  if (!effectiveLocationId) return { rule: null, locationId: null }
  const rules = await getPricingRules(effectiveLocationId)
  return { rule: matchRule(rules, tuple), locationId: effectiveLocationId }
}

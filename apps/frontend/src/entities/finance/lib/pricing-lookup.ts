import find from 'lodash/find'

import { getDefaultLocation } from 'entities/locations'

import { getPricingRules } from '../model/finance.repo'
import { matchRule } from './rule-match'

import type { PricingRule } from '../model/types'
import type { RuleTuple } from './rule-match'

export type { RuleTuple } from './rule-match'
export { clientTypeToTuple, matchRule, subTypeToTuple } from './rule-match'

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

/**
 * Для онлайн-сессий: сначала ищет тариф с lessonKind='online',
 * при отсутствии — откатывается к 'individual' (цена та же, зал не оплачивается).
 */
export async function resolvePricingRuleForOnline(
  locationId: string | null,
  tuple: RuleTuple,
): Promise<{ rule: PricingRule | null; locationId: string | null }> {
  const onlineResult = await resolvePricingRule(locationId, { ...tuple, lessonKind: 'online' })
  if (onlineResult.rule) return onlineResult
  return resolvePricingRule(locationId, { ...tuple, lessonKind: 'individual' })
}

/**
 * Тариф для общего абонемента: ищет lessonKind='shared' по формату и числу
 * занятий, БЕЗ учёта длительности (общий покрывает группы разной длительности).
 */
export async function resolvePricingRuleForShared(
  locationId: string | null,
  tuple: Pick<RuleTuple, 'format' | 'sessionsCount'>,
): Promise<{ rule: PricingRule | null; locationId: string | null }> {
  let effectiveLocationId = locationId
  if (!effectiveLocationId) {
    const def = await getDefaultLocation()
    effectiveLocationId = def?.id ?? null
  }
  if (!effectiveLocationId) return { rule: null, locationId: null }
  const rules = await getPricingRules(effectiveLocationId)
  const rule =
    find(
      rules,
      (r) =>
        r.lesson_kind === 'shared' &&
        r.format === tuple.format &&
        r.sessions_count === tuple.sessionsCount,
    ) ?? null
  return { rule, locationId: effectiveLocationId }
}

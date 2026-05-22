import meanBy from 'lodash/meanBy'
import round from 'lodash/round'
import size from 'lodash/size'

import type { PricingRule, PricingRuleInput } from '../model/types'

/** Маржа тарифа = цена клиента − расход зала, для обычной и Prime цены. */
export interface RuleMargin {
  regular: number
  prime: number
}

export function getRuleMargin(rule: PricingRule): RuleMargin {
  return {
    regular: rule.client_price - rule.hall_cost,
    prime: rule.client_prime_price - rule.hall_prime_cost,
  }
}

/** Знак маржи: ниже нуля — убыток, ноль — в ноль, выше — прибыль. */
export type MarginTone = 'neg' | 'zero' | 'pos'

export function getMarginTone(value: number): MarginTone {
  if (value < 0) return 'neg'
  if (value === 0) return 'zero'
  return 'pos'
}

/** Сводка по локации: количество тарифов и средняя маржа. */
export interface PricingSummary {
  count: number
  avgMargin: number
  avgPrimeMargin: number
}

export function getPricingSummary(rules: PricingRule[]): PricingSummary {
  if (!size(rules)) {
    return { count: 0, avgMargin: 0, avgPrimeMargin: 0 }
  }
  return {
    count: size(rules),
    avgMargin: round(meanBy(rules, (r) => r.client_price - r.hall_cost)),
    avgPrimeMargin: round(meanBy(rules, (r) => r.client_prime_price - r.hall_prime_cost)),
  }
}

/** Полезная нагрузка для дублирования тарифа — копия всех полей. */
export function buildDuplicatePayload(rule: PricingRule, titleSuffix: string): PricingRuleInput {
  return {
    location_id: rule.location_id,
    title: `${rule.title} ${titleSuffix}`,
    lesson_kind: rule.lesson_kind,
    format: rule.format,
    duration_minutes: rule.duration_minutes,
    sessions_count: rule.sessions_count,
    client_price: rule.client_price,
    client_prime_price: rule.client_prime_price,
    hall_cost: rule.hall_cost,
    hall_prime_cost: rule.hall_prime_cost,
    active: rule.active,
  }
}

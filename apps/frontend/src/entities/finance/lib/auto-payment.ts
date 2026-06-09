import { todayISO } from 'common/utils/date'
import { isPrimeTime } from 'entities/trainings/model/training-logic'

import { createHallCost, createPayment } from '../model/finance.repo'
import {
  resolvePricingRule,
  resolvePricingRuleForOnline,
  resolvePricingRuleForShared,
  subTypeToTuple,
} from './pricing-lookup'

import type { ClientPaymentType, HallPaymentType } from '../model/types'

type SubType = '1' | '4' | '8' | '1_90' | '4_90' | '8_90' | '1_pair' | '1_pair_90'

interface AutoSub {
  id: string
  type: SubType
  createdAt?: string
}

interface AutoPaymentOptions {
  time?: string
  isPrime?: boolean
  /** Локация абонемента (из тренировки/группы). Если нет — дефолтная. */
  locationId?: string | null
  /** Онлайн-сессия: тариф ищется online→individual, расход зала не пишется. */
  isOnline?: boolean
  /** Общий абонемент: тариф ищется по виду 'shared' (по числу занятий). */
  isShared?: boolean
}

/** Maps a subscription type to the finance payment type. */
export function subPaymentType(
  subType: SubType,
  isIndividual: boolean,
): ClientPaymentType | null {
  if (subType === '1') return isIndividual ? 'single_individual' : 'single_group'
  if (subType === '4') return isIndividual ? 'individual_sub_4' : 'group_sub_4'
  if (subType === '8') return isIndividual ? 'individual_sub_8' : 'group_sub_8'
  if (subType === '1_90') return 'single_individual_90'
  if (subType === '4_90') return 'individual_sub_4_90'
  if (subType === '8_90') return 'individual_sub_8_90'
  if (subType === '1_pair') return 'single_pair'
  if (subType === '1_pair_90') return 'single_pair_90'
  return null
}

interface AutoPaymentResult {
  paymentId: string
}

/**
 * Auto-creates a client payment + linked hall cost when a subscription is created.
 * Prices come from the location's pricing rules, matched by the tuple
 * (lessonKind, format, durationMinutes, sessionsCount). If no rule matches the
 * amounts default to 0. Returns the created payment id.
 */
export async function autoCreatePayment(
  studentId: string,
  sub: AutoSub,
  isIndividual: boolean,
  opts: AutoPaymentOptions = {},
): Promise<AutoPaymentResult | null> {
  const paymentType = subPaymentType(sub.type, isIndividual)
  if (!paymentType) return null

  const paidAt = sub.createdAt || todayISO()
  const isPrime = opts.isPrime ?? (opts.time ? isPrimeTime(paidAt, opts.time) : false)
  const timeSlot = isPrime ? 'prime' : 'regular'

  const tuple = subTypeToTuple(sub.type, isIndividual)
  const { rule, locationId } = opts.isShared
    ? await resolvePricingRuleForShared(opts.locationId ?? null, {
        format: tuple.format,
        sessionsCount: tuple.sessionsCount,
      })
    : opts.isOnline
      ? await resolvePricingRuleForOnline(opts.locationId ?? null, tuple)
      : await resolvePricingRule(opts.locationId ?? null, tuple)

  // Нет тарифа для этого посещения → ничего не пишем (без нулевых записей).
  if (!rule) return null

  const clientAmount = isPrime ? rule.client_prime_price : rule.client_price

  // Очные сессии списывают расход зала (прайм/обычный); онлайн зал не
  // использует, поэтому расход не создаём.
  let hallCostId: string | null = null
  if (!opts.isOnline) {
    const hallAmount = isPrime ? rule.hall_prime_cost : rule.hall_cost
    const hallCost = await createHallCost({
      student_id: studentId,
      location_id: locationId,
      hall_payment_type: paymentType as HallPaymentType,
      time_slot: timeSlot,
      training_time: opts.time || '',
      hall_amount: hallAmount,
      paid_at: paidAt,
    })
    hallCostId = hallCost.id
  }

  const payment = await createPayment({
    student_id: studentId,
    location_id: locationId,
    client_payment_type: paymentType,
    client_amount: clientAmount,
    hall_cost_id: hallCostId,
    paid_at: paidAt,
  })

  return { paymentId: payment.id }
}

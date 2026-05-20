import { isPrimeTime } from 'entities/trainings/model/training-logic'

import { createHallCost, createPayment, getPricing } from '../model/finance.repo'

import type { ClientPaymentType, HallPaymentType } from '../model/types'

type SubType = '1' | '4' | '8' | '1_90' | '4_90' | '8_90'

interface AutoSub {
  id: string
  type: SubType
  createdAt?: string
}

interface AutoPaymentOptions {
  time?: string
  isPrime?: boolean
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
  return null
}

/** 1.5h types reuse 1h individual hall pricing. */
const HALL_TYPE_ALIAS: Partial<Record<ClientPaymentType, HallPaymentType>> = {
  single_individual_90: 'single_individual',
  individual_sub_4_90: 'individual_sub_4',
  individual_sub_8_90: 'individual_sub_8',
}

interface AutoPaymentResult {
  paymentId: string
}

/**
 * Auto-creates a client payment + linked hall cost when a subscription is created.
 * Returns the created payment id (link it to the subscription via linkPaymentToSub).
 */
export async function autoCreatePayment(
  studentId: string,
  sub: AutoSub,
  isIndividual: boolean,
  opts: AutoPaymentOptions = {},
): Promise<AutoPaymentResult | null> {
  const paymentType = subPaymentType(sub.type, isIndividual)
  if (!paymentType) return null

  const pricing = await getPricing()
  const clientAmount = pricing[`client_${paymentType}_price`] ?? 0
  const paidAt = sub.createdAt || new Date().toISOString().slice(0, 10)

  const hallType = HALL_TYPE_ALIAS[paymentType] ?? paymentType
  const isPrime = opts.isPrime ?? (opts.time ? isPrimeTime(paidAt, opts.time) : false)
  const timeSlot = isPrime ? 'prime' : 'regular'
  const hallAmount = pricing[`hall_${hallType}_${timeSlot}_price`] ?? 0

  const hallCost = await createHallCost({
    student_id: studentId,
    hall_payment_type: hallType,
    time_slot: timeSlot,
    training_time: opts.time || '',
    hall_amount: hallAmount,
    paid_at: paidAt,
  })

  const payment = await createPayment({
    student_id: studentId,
    client_payment_type: paymentType,
    client_amount: clientAmount,
    hall_cost_id: hallCost.id,
    paid_at: paidAt,
  })

  return { paymentId: payment.id }
}

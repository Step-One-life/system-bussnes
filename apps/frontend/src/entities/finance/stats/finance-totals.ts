import type { HallCost, Payment } from '../model/types'

import { roundMoney, sumMoney } from '@trikick/shared'

export interface FinanceTotals {
  totalIncome: number
  totalHall: number
  netIncome: number
  margin: number
  avgCheck: number
  activeCount: number
  recordCount: number
}

/**
 * Итоги периода (оба списка уже отфильтрованы по периоду). Расходы зала
 * суммируются напрямую из hallCosts: раньше учитывались только привязанные
 * к платежам (через p.hall_cost_id), и standalone-расход, внесённый вручную
 * без платежа, выпадал из totalHall — маржа завышалась.
 */
export function financeTotals(payments: Payment[], hallCosts: HallCost[]): FinanceTotals {
  const totalIncome = sumMoney(payments.map((p) => p.client_amount))
  const totalHall = sumMoney(hallCosts.map((c) => c.hall_amount))
  const netIncome = roundMoney(totalIncome - totalHall)
  return {
    totalIncome,
    totalHall,
    netIncome,
    margin: totalIncome > 0 ? Math.round((netIncome / totalIncome) * 100) : 0,
    avgCheck: payments.length > 0 ? Math.round(totalIncome / payments.length) : 0,
    activeCount: payments.filter((p) => p.status === 'active').length,
    recordCount: payments.length,
  }
}

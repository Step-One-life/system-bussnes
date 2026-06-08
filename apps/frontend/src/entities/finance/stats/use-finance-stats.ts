import { useMemo, useState } from 'react'

import { toLocalISODate } from 'common/utils/date'
import { FIN_LABELS } from 'entities/finance/model/finance-constants'
import { useStudents } from 'entities/students'

import { useHallCosts, usePayments } from '../api/use-finance'

import type { HallCost, Payment } from '../model/types'

export type FinancePeriod = 'month' | 'quarter' | 'year' | 'all'

export const PERIOD_LABELS: Record<FinancePeriod, string> = {
  month: 'Месяц',
  quarter: 'Квартал',
  year: 'Год',
  all: 'Всё время',
}

interface PeriodRange {
  start: string | null
  end: string | null
}

const RU_MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

/** Границы периода со сдвигом назад на `offset` единиц. Без UTC-сдвигов. */
function periodRange(period: FinancePeriod, offset: number): PeriodRange {
  const now = new Date()
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    return { start: toLocalISODate(start), end: toLocalISODate(end) }
  }
  if (period === 'quarter') {
    const curQuarter = Math.floor(now.getMonth() / 3)
    const startMonth = (curQuarter - offset) * 3
    const start = new Date(now.getFullYear(), startMonth, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 3, 0)
    return { start: toLocalISODate(start), end: toLocalISODate(end) }
  }
  if (period === 'year') {
    const start = new Date(now.getFullYear() - offset, 0, 1)
    const end = new Date(now.getFullYear() - offset, 11, 31)
    return { start: toLocalISODate(start), end: toLocalISODate(end) }
  }
  return { start: null, end: null }
}

/** Подпись текущего периода: «Июнь 2026» / «Q2 2026» / «2026»; для all — пусто. */
function periodLabelFor(period: FinancePeriod, offset: number): string {
  const now = new Date()
  if (period === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    return `${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`
  }
  if (period === 'quarter') {
    const curQuarter = Math.floor(now.getMonth() / 3)
    const startMonth = (curQuarter - offset) * 3
    const d = new Date(now.getFullYear(), startMonth, 1)
    const q = Math.floor(d.getMonth() / 3) + 1
    return `Q${q} ${d.getFullYear()}`
  }
  if (period === 'year') {
    return String(now.getFullYear() - offset)
  }
  return ''
}

export interface FinanceTotals {
  totalIncome: number
  totalHall: number
  netIncome: number
  margin: number
  avgCheck: number
  activeCount: number
  recordCount: number
}

export interface MonthlyPoint {
  label: string
  income: number
  hall: number
  net: number
}

export interface TypeBreakdown {
  labels: string[]
  values: number[]
}

export interface TopClient {
  name: string
  amount: number
}

export interface FinanceStats {
  period: FinancePeriod
  setPeriod: (period: FinancePeriod) => void
  offset: number
  prev: () => void
  next: () => void
  canGoNext: boolean
  periodLabel: string
  totals: FinanceTotals
  monthly: MonthlyPoint[]
  clientTypes: TypeBreakdown
  hallTypes: TypeBreakdown
  topClients: TopClient[]
}

export function useFinanceStats(): FinanceStats {
  const { data: payments = [] } = usePayments()
  const { data: hallCosts = [] } = useHallCosts()
  const { data: students = [] } = useStudents()

  const [period, setPeriodState] = useState<FinancePeriod>('month')
  const [offset, setOffset] = useState(0)

  const setPeriod = (p: FinancePeriod) => {
    setPeriodState(p)
    setOffset(0)
  }

  const prev = () => setOffset((o) => o + 1)
  const next = () => setOffset((o) => Math.max(0, o - 1))
  const canGoNext = offset > 0
  const periodLabel = periodLabelFor(period, offset)

  const hallMap = useMemo(() => new Map(hallCosts.map((c) => [c.id, c])), [hallCosts])
  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students],
  )

  const filtered = useMemo<Payment[]>(() => {
    const { start, end } = periodRange(period, offset)
    if (!start && !end) return payments
    return payments.filter(
      (p) => (!start || p.paid_at >= start) && (!end || p.paid_at <= end),
    )
  }, [payments, period, offset])

  const hallAmount = (p: Payment): number =>
    (p.hall_cost_id ? hallMap.get(p.hall_cost_id)?.hall_amount : 0) ?? 0

  const totals = useMemo<FinanceTotals>(() => {
    const totalIncome = filtered.reduce((s, p) => s + p.client_amount, 0)
    const totalHall = filtered.reduce((s, p) => s + hallAmount(p), 0)
    const netIncome = totalIncome - totalHall
    return {
      totalIncome,
      totalHall,
      netIncome,
      margin: totalIncome > 0 ? Math.round((netIncome / totalIncome) * 100) : 0,
      avgCheck: filtered.length > 0 ? Math.round(totalIncome / filtered.length) : 0,
      activeCount: filtered.filter((p) => p.status === 'active').length,
      recordCount: filtered.length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, hallMap])

  const monthly = useMemo<MonthlyPoint[]>(() => {
    const byMonth = new Map<string, { income: number; hall: number }>()
    for (const p of payments) {
      const m = p.paid_at.slice(0, 7)
      const acc = byMonth.get(m) ?? { income: 0, hall: 0 }
      acc.income += p.client_amount
      acc.hall += hallAmount(p)
      byMonth.set(m, acc)
    }
    return [...byMonth.keys()]
      .sort()
      .map((m) => {
        const acc = byMonth.get(m)!
        const [y, mo] = m.split('-')
        const label = new Date(+y, +mo - 1, 1).toLocaleString('ru', {
          month: 'short',
          year: '2-digit',
        })
        return { label, income: acc.income, hall: acc.hall, net: acc.income - acc.hall }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, hallMap])

  const clientTypes = useMemo<TypeBreakdown>(() => {
    const map = new Map<string, number>()
    for (const p of filtered) {
      const label = FIN_LABELS[p.client_payment_type] ?? p.client_payment_type
      map.set(label, (map.get(label) ?? 0) + p.client_amount)
    }
    return { labels: [...map.keys()], values: [...map.values()] }
  }, [filtered])

  const hallTypes = useMemo<TypeBreakdown>(() => {
    const map = new Map<string, number>()
    for (const p of filtered) {
      const hc: HallCost | undefined = p.hall_cost_id
        ? hallMap.get(p.hall_cost_id)
        : undefined
      if (!hc) continue
      const label = FIN_LABELS[hc.hall_payment_type] ?? hc.hall_payment_type
      map.set(label, (map.get(label) ?? 0) + hc.hall_amount)
    }
    return { labels: [...map.keys()], values: [...map.values()] }
  }, [filtered, hallMap])

  const topClients = useMemo<TopClient[]>(() => {
    const map = new Map<string, number>()
    for (const p of filtered) {
      if (!p.student_id) continue
      const name = studentMap.get(p.student_id)?.name ?? 'Неизвестен'
      map.set(name, (map.get(name) ?? 0) + p.client_amount)
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, amount]) => ({ name, amount }))
  }, [filtered, studentMap])

  return {
    period,
    setPeriod,
    offset,
    prev,
    next,
    canGoNext,
    periodLabel,
    totals,
    monthly,
    clientTypes,
    hallTypes,
    topClients,
  }
}

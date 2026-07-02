import { useMemo, useState } from 'react'

import i18n from 'i18next'
import { useTranslation } from 'react-i18next'

import { toLocalISODate } from 'common/utils/date'
import { finLabel } from 'entities/finance/model/finance-constants'
import { useStudents } from 'entities/students'

import { useHallCosts, usePayments } from '../api/use-finance'
import { financeTotals } from './finance-totals'

import type { FinanceTotals } from './finance-totals'
import type { HallCost, Payment } from '../model/types'

import { roundMoney } from '@trikick/shared'

export type FinancePeriod = 'month' | 'quarter' | 'year' | 'all'

interface PeriodRange {
  start: string | null
  end: string | null
}

/** Название месяца на текущем языке с заглавной буквы («Июнь» / "June"). */
function monthName(d: Date): string {
  const name = d.toLocaleString(i18n.language, { month: 'long' })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

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
    return `${monthName(d)} ${d.getFullYear()}`
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

export type { FinanceTotals }

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
  isError: boolean
  refetch: () => void
}

export function useFinanceStats(): FinanceStats {
  // Подписка на язык: метки месяцев/типов в useMemo пересчитываются после
  // переключения языка.
  const { i18n: i18nInstance } = useTranslation()
  const lang = i18nInstance.language
  const { data: payments = [], isError: paymentsError, refetch: refetchPayments } = usePayments()
  const { data: hallCosts = [], isError: hallError, refetch: refetchHall } = useHallCosts()
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

  // Расходы зала фильтруются по СВОЕЙ дате и считаются напрямую: расход,
  // не привязанный к платежу (standalone), раньше выпадал из статистики.
  const filteredHall = useMemo<HallCost[]>(() => {
    const { start, end } = periodRange(period, offset)
    if (!start && !end) return hallCosts
    return hallCosts.filter(
      (c) => (!start || c.paid_at >= start) && (!end || c.paid_at <= end),
    )
  }, [hallCosts, period, offset])

  const totals = useMemo<FinanceTotals>(
    () => financeTotals(filtered, filteredHall),
    [filtered, filteredHall],
  )

  const monthly = useMemo<MonthlyPoint[]>(() => {
    const byMonth = new Map<string, { income: number; hall: number }>()
    const monthAcc = (m: string) => {
      let acc = byMonth.get(m)
      if (!acc) {
        acc = { income: 0, hall: 0 }
        byMonth.set(m, acc)
      }
      return acc
    }
    for (const p of payments) monthAcc(p.paid_at.slice(0, 7)).income += p.client_amount
    // Расходы — напрямую из hallCosts (standalone-расход виден в графике).
    for (const c of hallCosts) monthAcc(c.paid_at.slice(0, 7)).hall += c.hall_amount
    return [...byMonth.keys()]
      .sort()
      .map((m) => {
        const acc = byMonth.get(m)!
        const [y, mo] = m.split('-')
        const label = new Date(+y, +mo - 1, 1).toLocaleString(lang, {
          month: 'short',
          year: '2-digit',
        })
        return {
          label,
          income: roundMoney(acc.income),
          hall: roundMoney(acc.hall),
          net: roundMoney(acc.income - acc.hall),
        }
      })
  }, [payments, hallCosts, lang])

  const clientTypes = useMemo<TypeBreakdown>(() => {
    const map = new Map<string, number>()
    for (const p of filtered) {
      const label = finLabel(p.client_payment_type)
      map.set(label, (map.get(label) ?? 0) + p.client_amount)
    }
    return { labels: [...map.keys()], values: [...map.values()].map(roundMoney) }
    // lang нужен: finLabel читает язык внутри — лейблы пересчитываются при его смене
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, lang])

  const hallTypes = useMemo<TypeBreakdown>(() => {
    const map = new Map<string, number>()
    for (const hc of filteredHall) {
      const label = finLabel(hc.hall_payment_type)
      map.set(label, (map.get(label) ?? 0) + hc.hall_amount)
    }
    return { labels: [...map.keys()], values: [...map.values()].map(roundMoney) }
    // lang нужен: finLabel читает язык внутри — лейблы пересчитываются при его смене
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredHall, lang])

  const topClients = useMemo<TopClient[]>(() => {
    const map = new Map<string, number>()
    for (const p of filtered) {
      if (!p.student_id) continue
      const name = studentMap.get(p.student_id)?.name ?? i18n.t('finance.stats.unknownClient')
      map.set(name, (map.get(name) ?? 0) + p.client_amount)
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, amount]) => ({ name, amount: roundMoney(amount) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, studentMap, lang])

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
    isError: paymentsError || hallError,
    refetch: () => {
      refetchPayments()
      refetchHall()
    },
  }
}

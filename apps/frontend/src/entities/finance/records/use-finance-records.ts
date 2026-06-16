import { useMemo, useState } from 'react'

import filter from 'lodash/filter'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import join from 'lodash/join'
import map from 'lodash/map'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { formatDateShort } from 'common/utils/date'
import { finLabel } from 'entities/finance/model/finance-constants'
import { useStudents } from 'entities/students'

import { useDeletePayment, useHallCosts, usePayments } from '../api/use-finance'

import type { HallCost, Payment } from '../model/types'

export interface FinanceRecordItem {
  payment: Payment
  hallCost: HallCost | null
  studentName: string | null
  searchValue: string
}

export function useFinanceRecords() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { data: payments = [], isLoading, isError, refetch } = usePayments()
  const { data: hallCosts = [] } = useHallCosts()
  const { data: students = [] } = useStudents()
  const deletePayment = useDeletePayment()

  const [query, setQuery] = useState('')

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students],
  )
  const hallMap = useMemo(() => new Map(hallCosts.map((c) => [c.id, c])), [hallCosts])

  const items = useMemo<FinanceRecordItem[]>(
    () =>
      map(payments, (p) => {
        const studentName = p.student_id
          ? (studentMap.get(p.student_id)?.name ?? null)
          : null
        const hallCost = p.hall_cost_id ? (hallMap.get(p.hall_cost_id) ?? null) : null
        const searchValue = join(
          [
            studentName ?? '',
            finLabel(p.client_payment_type),
            formatDateShort(p.paid_at),
          ],
          ' ',
        ).toLowerCase()
        return { payment: p, hallCost, studentName, searchValue }
      }),
    // Язык в deps: после переключения языка поиск идёт по новым меткам.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payments, studentMap, hallMap, i18n.language],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return filter(items, (item) => includes(item.searchValue, q))
  }, [items, query])

  const handleDelete = async (payment: Payment) => {
    // Сбой удаления (напр. 409) раньше уходил в unhandled rejection без тоста.
    try {
      await deletePayment.mutateAsync(payment.id)
      toast({ type: 'success', title: t('finance.records.deleted') })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return {
    items,
    filtered,
    query,
    setQuery,
    handleDelete,
    isEmpty: isEmpty(payments),
    isLoading,
    isError,
    refetch,
  }
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createHallCost,
  createPayment,
  deleteHallCost,
  deletePayment,
  getHallCosts,
  getPayments,
  getPricing,
  savePricing,
  updateHallCost,
  updatePayment,
} from 'entities/finance/model/finance.repo'

import type {
  HallCost,
  HallCostInput,
  Payment,
  PaymentInput,
  Pricing,
} from 'entities/finance/model/types'

export const financeKeys = {
  payments: ['payments', 'all'] as const,
  hallCosts: ['hall-costs', 'all'] as const,
  pricing: ['pricing'] as const,
}

export function usePayments() {
  return useQuery({ queryKey: financeKeys.payments, queryFn: getPayments })
}

export function useHallCosts() {
  return useQuery({ queryKey: financeKeys.hallCosts, queryFn: getHallCosts })
}

export function usePricing() {
  return useQuery({ queryKey: financeKeys.pricing, queryFn: getPricing })
}

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PaymentInput) => createPayment(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.payments }),
  })
}

export function useUpdatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<Payment> }) =>
      updatePayment(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.payments }),
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.payments })
      qc.invalidateQueries({ queryKey: financeKeys.hallCosts })
    },
  })
}

export function useCreateHallCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: HallCostInput) => createHallCost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.hallCosts }),
  })
}

export function useUpdateHallCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<HallCost> }) =>
      updateHallCost(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.hallCosts }),
  })
}

export function useDeleteHallCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteHallCost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.hallCosts }),
  })
}

export function useSavePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Pricing) => savePricing(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.pricing }),
  })
}

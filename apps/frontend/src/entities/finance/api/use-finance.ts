import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  copyPricingRules,
  createHallCost,
  createPayment,
  createPricingRule,
  deleteHallCost,
  deletePayment,
  deletePricingRule,
  getHallCosts,
  getPayments,
  getPricingRules,
  updateHallCost,
  updatePayment,
  updatePricingRule,
} from 'entities/finance/model/finance.repo'

import type {
  HallCost,
  HallCostInput,
  Payment,
  PaymentInput,
  PricingRuleChanges,
  PricingRuleInput,
} from 'entities/finance/model/types'

export const financeKeys = {
  payments: ['payments', 'all'] as const,
  hallCosts: ['hall-costs', 'all'] as const,
  pricingRules: (locationId: string) => ['pricing-rules', locationId] as const,
}

export function usePayments() {
  return useQuery({ queryKey: financeKeys.payments, queryFn: getPayments })
}

export function useHallCosts() {
  return useQuery({ queryKey: financeKeys.hallCosts, queryFn: getHallCosts })
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

/* ── Pricing rules ── */

export function usePricingRules(locationId: string) {
  return useQuery({
    queryKey: financeKeys.pricingRules(locationId),
    queryFn: () => getPricingRules(locationId),
    enabled: !!locationId,
  })
}

export function useCreatePricingRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PricingRuleInput) => createPricingRule(data),
    onSuccess: (rule) =>
      qc.invalidateQueries({ queryKey: financeKeys.pricingRules(rule.location_id) }),
  })
}

export function useUpdatePricingRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: PricingRuleChanges }) =>
      updatePricingRule(id, changes),
    onSuccess: (rule) => {
      if (rule) qc.invalidateQueries({ queryKey: financeKeys.pricingRules(rule.location_id) })
    },
  })
}

export function useDeletePricingRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; locationId: string }) => deletePricingRule(id),
    onSuccess: (_res, { locationId }) =>
      qc.invalidateQueries({ queryKey: financeKeys.pricingRules(locationId) }),
  })
}

export function useCopyPricingRules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fromLocationId, toLocationId }: { fromLocationId: string; toLocationId: string }) =>
      copyPricingRules(fromLocationId, toLocationId),
    onSuccess: (_res, { toLocationId }) =>
      qc.invalidateQueries({ queryKey: financeKeys.pricingRules(toLocationId) }),
  })
}

import { createPricingRule, updatePricingRule } from './finance.repo'

import type { PricingRuleInput } from './types'

import { beforeEach, describe, expect, it, vi } from 'vitest'

// vi.hoisted + vi.mock поднимаются vitest выше импортов, поэтому мок api-client
// применяется до загрузки finance.repo (моки можно объявлять ниже импортов).
const { post, patch } = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }))

vi.mock('common/services/api/api-client', () => ({
  apiClient: { post, patch, get: vi.fn(), delete: vi.fn() },
}))

// Сырой ответ бэка (camelCase) — мэппер его читает корректно; нам важно, ЧТО
// уходит в теле запроса (срок действия тарифа раньше терялся на границе API).
const raw = {
  id: 'r1',
  locationId: 'loc1',
  title: 'Индивидуальный 8',
  lessonKind: 'individual',
  format: 'subscription',
  durationMinutes: 60,
  sessionsCount: 8,
  clientPrice: 100,
  clientPrimePrice: 120,
  hallCost: 0,
  hallPrimeCost: 0,
  validityDays: 10,
  active: true,
  createdAt: '2026-01-01',
}

const baseInput: PricingRuleInput = {
  location_id: 'loc1',
  title: 'Индивидуальный 8',
  lesson_kind: 'individual',
  format: 'subscription',
  duration_minutes: 60,
  sessions_count: 8,
  client_price: 100,
  client_prime_price: 120,
  hall_cost: 0,
  hall_prime_cost: 0,
  active: true,
}

describe('finance.repo pricing mapper — срок действия (validity_days)', () => {
  beforeEach(() => {
    post.mockReset()
    patch.mockReset()
    post.mockResolvedValue(raw)
    patch.mockResolvedValue(raw)
  })

  it('createPricingRule кладёт validityDays из инпута в тело запроса', async () => {
    await createPricingRule({ ...baseInput, validity_days: 10 })
    expect(post).toHaveBeenCalledWith(
      '/finance/pricing-rules',
      expect.objectContaining({ validityDays: 10 }),
    )
  })

  it('createPricingRule ставит дефолт 35, когда срок не задан', async () => {
    await createPricingRule(baseInput)
    expect(post).toHaveBeenCalledWith(
      '/finance/pricing-rules',
      expect.objectContaining({ validityDays: 35 }),
    )
  })

  it('updatePricingRule пробрасывает изменённый validityDays', async () => {
    await updatePricingRule('r1', { validity_days: 20 })
    expect(patch).toHaveBeenCalledWith(
      '/finance/pricing-rules/r1',
      expect.objectContaining({ validityDays: 20 }),
    )
  })

  it('updatePricingRule НЕ шлёт validityDays, когда срок не менялся', async () => {
    await updatePricingRule('r1', { title: 'Новый' })
    const body = patch.mock.calls[0][1] as Record<string, unknown>
    expect(body).not.toHaveProperty('validityDays')
  })
})

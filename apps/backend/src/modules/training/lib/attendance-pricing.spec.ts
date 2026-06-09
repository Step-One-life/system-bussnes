import { attendancePricing } from './attendance-pricing'

const t = (over: Partial<Parameters<typeof attendancePricing>[0]> = {}) => ({
  isPair: false,
  isOnline: false,
  sessionDuration: 60,
  ...over,
})

describe('attendancePricing', () => {
  it('парная 60 → pair/60, single_pair', () => {
    const p = attendancePricing(t({ isPair: true }), false)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual(['pair/60'])
    expect(p.paymentType).toBe('single_pair')
  })

  it('парная 90 → pair/90, single_pair_90', () => {
    const p = attendancePricing(t({ isPair: true, sessionDuration: 90 }), false)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual(['pair/90'])
    expect(p.paymentType).toBe('single_pair_90')
  })

  it('онлайн 60 → online/60 затем individual/60, single_individual', () => {
    const p = attendancePricing(t({ isOnline: true }), true)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual([
      'online/60',
      'individual/60',
    ])
    expect(p.paymentType).toBe('single_individual')
  })

  it('онлайн 90 → online/90 затем individual/90, single_individual_90', () => {
    const p = attendancePricing(t({ isOnline: true, sessionDuration: 90 }), true)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual([
      'online/90',
      'individual/90',
    ])
    expect(p.paymentType).toBe('single_individual_90')
  })

  it('индивидуальная 60 → individual/60, single_individual', () => {
    const p = attendancePricing(t(), true)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual([
      'individual/60',
    ])
    expect(p.paymentType).toBe('single_individual')
  })

  it('индивидуальная 90 → individual/90, single_individual_90', () => {
    const p = attendancePricing(t({ sessionDuration: 90 }), true)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual([
      'individual/90',
    ])
    expect(p.paymentType).toBe('single_individual_90')
  })

  it('групповая 60 → group/60, single_group', () => {
    const p = attendancePricing(t(), false)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual(['group/60'])
    expect(p.paymentType).toBe('single_group')
  })

  it('групповая 90 → исторически individual/90, single_individual_90', () => {
    const p = attendancePricing(t({ sessionDuration: 90 }), false)
    expect(p.attempts.map((a) => `${a.lessonKind}/${a.durationMinutes}`)).toEqual([
      'individual/90',
    ])
    expect(p.paymentType).toBe('single_individual_90')
  })

  it('парность важнее онлайна', () => {
    const p = attendancePricing(t({ isPair: true, isOnline: true }), false)
    expect(p.paymentType).toBe('single_pair')
  })

  it('кривая длительность нормализуется к 60', () => {
    const p = attendancePricing(t({ sessionDuration: 45 }), true)
    expect(p.attempts[0].durationMinutes).toBe(60)
    expect(p.paymentType).toBe('single_individual')
  })
})

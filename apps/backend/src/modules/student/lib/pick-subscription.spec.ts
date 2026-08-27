import { covers, isNotExpired, pickSubForDeduct } from './pick-subscription'

import type { PickableSub } from './pick-subscription'

const TODAY = '2026-06-10'

const sub = (over: Partial<PickableSub>): PickableSub => ({
  groupId: 'g1',
  groupIds: null,
  sessionDuration: 60,
  expiresAt: '2026-12-31',
  isPair: false,
  isUnlimited: false,
  ...over,
})

describe('isNotExpired', () => {
  it('действует в день истечения включительно', () => {
    expect(isNotExpired({ expiresAt: TODAY }, TODAY)).toBe(true)
  })

  it('истёкший вчера — не действует', () => {
    expect(isNotExpired({ expiresAt: '2026-06-09' }, TODAY)).toBe(false)
  })

  it('без срока — действует', () => {
    expect(isNotExpired({ expiresAt: '' }, TODAY)).toBe(true)
  })
})

describe('covers', () => {
  it('свой абонемент покрывает свою группу', () => {
    expect(covers(sub({}), 'g1')).toBe(true)
    expect(covers(sub({}), 'g2')).toBe(false)
  })

  it('общий покрывает группы из списка', () => {
    const shared = sub({ groupId: 'g1', groupIds: ['g1', 'g2'] })
    expect(covers(shared, 'g2')).toBe(true)
    expect(covers(shared, 'g3')).toBe(false)
  })
})

describe('pickSubForDeduct', () => {
  it('истёкший по сроку абонемент не выбирается (K2)', () => {
    const expired = sub({ expiresAt: '2026-06-01' })
    expect(pickSubForDeduct([expired], 'g1', 60, TODAY)).toBeNull()
  })

  it('предпочитает свой с совпадающей длительностью', () => {
    const s60 = sub({ sessionDuration: 60 })
    const s90 = sub({ sessionDuration: 90 })
    expect(pickSubForDeduct([s60, s90], 'g1', 90, TODAY)).toBe(s90)
    expect(pickSubForDeduct([s60, s90], 'g1', 60, TODAY)).toBe(s60)
  })

  it('без совпадения длительности берёт любой свой', () => {
    const s60 = sub({ sessionDuration: 60 })
    expect(pickSubForDeduct([s60], 'g1', 90, TODAY)).toBe(s60)
  })

  it('общий выбирается, когда своего нет', () => {
    const shared = sub({ groupId: 'g2', groupIds: ['g2', 'g1'] })
    expect(pickSubForDeduct([shared], 'g1', 60, TODAY)).toBe(shared)
  })

  it('действующий свой приоритетнее общего, истёкший свой уступает общему', () => {
    const own = sub({ sessionDuration: 60 })
    const shared = sub({ groupId: 'g2', groupIds: ['g2', 'g1'] })
    expect(pickSubForDeduct([shared, own], 'g1', 60, TODAY)).toBe(own)

    const ownExpired = sub({ expiresAt: '2026-01-01' })
    expect(pickSubForDeduct([ownExpired, shared], 'g1', 60, TODAY)).toBe(shared)
  })
})

describe('pickSubForDeduct — парные vs индивидуальные на одной группе', () => {
  it('парная отметка (wantPair) берёт только парный, не трогает индивидуальный', () => {
    const indiv = sub({ isPair: false })
    const pair = sub({ isPair: true })
    expect(pickSubForDeduct([indiv, pair], 'g1', 60, TODAY, true)).toBe(pair)
  })

  it('обычная отметка (wantPair=false) берёт только индивидуальный, не трогает парный', () => {
    const indiv = sub({ isPair: false })
    const pair = sub({ isPair: true })
    expect(pickSubForDeduct([pair, indiv], 'g1', 60, TODAY, false)).toBe(indiv)
  })

  it('нет подходящего по виду — null (парная отметка, есть только индивидуальный)', () => {
    const indiv = sub({ isPair: false })
    expect(pickSubForDeduct([indiv], 'g1', 60, TODAY, true)).toBeNull()
  })
})

describe('pickSubForDeduct — безлимит', () => {
  it('считаемый абонемент приоритетнее безлимита (оба подходят)', () => {
    const counted = sub({ isUnlimited: false })
    const unlim = sub({ isUnlimited: true })
    expect(pickSubForDeduct([unlim, counted], 'g1', 60, TODAY)).toBe(counted)
  })

  it('безлимит выбирается, когда считаемого нет', () => {
    const unlim = sub({ isUnlimited: true })
    expect(pickSubForDeduct([unlim], 'g1', 60, TODAY)).toBe(unlim)
  })

  it('истёкший безлимит не выбирается', () => {
    const unlim = sub({ isUnlimited: true, expiresAt: '2026-06-01' })
    expect(pickSubForDeduct([unlim], 'g1', 60, TODAY)).toBeNull()
  })
})

// D10/S1: биллинг считается на дату ЗАНЯТИЯ, а не на момент клика. Тренер
// отмечает 27 августа занятие от 5 августа; абонемент действовал до 20 августа.
describe('pickSubForDeduct — отметка задним числом', () => {
  const LESSON_DAY = '2026-08-05'
  const CLICK_DAY = '2026-08-27'

  it('абонемент, истёкший ПОСЛЕ даты занятия, списывается', () => {
    const old = sub({ expiresAt: '2026-08-20' })
    expect(pickSubForDeduct([old], 'g1', 60, LESSON_DAY)).toBe(old)
  })

  it('он же на «сегодня» не выбирается — старое поведение уводило в авто-платёж', () => {
    const old = sub({ expiresAt: '2026-08-20' })
    expect(pickSubForDeduct([old], 'g1', 60, CLICK_DAY)).toBeNull()
  })

  it('абонемент, купленный ПОСЛЕ занятия, за то занятие не списывается', () => {
    const fresh = sub({ expiresAt: '2026-12-31' })
    const old = sub({ expiresAt: '2026-08-20', sessionDuration: 90 })
    // На дату занятия действуют оба; «свой» по длительности — старый.
    expect(pickSubForDeduct([fresh, old], 'g1', 90, LESSON_DAY)).toBe(old)
  })

  it('в день истечения абонемент ещё действует', () => {
    const edge = sub({ expiresAt: LESSON_DAY })
    expect(pickSubForDeduct([edge], 'g1', 60, LESSON_DAY)).toBe(edge)
  })
})

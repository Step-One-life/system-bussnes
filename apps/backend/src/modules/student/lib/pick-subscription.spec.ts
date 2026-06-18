import { covers, isNotExpired, pickSubForDeduct } from './pick-subscription'

import type { PickableSub } from './pick-subscription'

const TODAY = '2026-06-10'

const sub = (over: Partial<PickableSub>): PickableSub => ({
  groupId: 'g1',
  groupIds: null,
  sessionDuration: 60,
  expiresAt: '2026-12-31',
  isPair: false,
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

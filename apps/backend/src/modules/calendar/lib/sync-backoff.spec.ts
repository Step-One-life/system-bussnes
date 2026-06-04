import { nextRunAfter } from './sync-backoff'

describe('nextRunAfter', () => {
  const base = new Date('2026-06-04T10:00:00.000Z')

  it('первая попытка — задержка ~30 c', () => {
    const d = nextRunAfter(1, base)
    expect(d.getTime() - base.getTime()).toBe(30_000)
  })

  it('задержка растёт экспоненциально', () => {
    expect(nextRunAfter(2, base).getTime() - base.getTime()).toBe(60_000)
    expect(nextRunAfter(3, base).getTime() - base.getTime()).toBe(120_000)
  })

  it('ограничена сверху 1 часом', () => {
    expect(nextRunAfter(99, base).getTime() - base.getTime()).toBe(3_600_000)
  })
})

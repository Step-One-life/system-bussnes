import { eventIdFor } from './event-id'

describe('eventIdFor', () => {
  it('убирает дефисы и приводит к нижнему регистру', () => {
    expect(eventIdFor('A1B2C3D4-E5F6-7890-ABCD-EF1234567890')).toBe(
      'a1b2c3d4e5f67890abcdef1234567890',
    )
  })

  it('даёт валидный для Google id (32 символа [0-9a-v])', () => {
    const id = eventIdFor('11111111-2222-3333-4444-555555555555')
    expect(id).toHaveLength(32)
    expect(id).toMatch(/^[0-9a-v]+$/)
  })
})

import { NotFoundException } from '@nestjs/common'

import { assertOwned, CountableModel } from './assert-owned'

/** Заглушка модели: count возвращает число id из where, принадлежащих owner'у. */
function fakeModel(ownedByUser: Record<string, string[]>): CountableModel & { calls: number } {
  return {
    calls: 0,
    async count({ where }) {
      this.calls += 1
      const userId = where.userId as string
      const raw = where.id as string | string[]
      const ids = Array.isArray(raw) ? raw : [raw]
      const owned = ownedByUser[userId] ?? []
      return ids.filter((id) => owned.includes(id)).length
    },
  }
}

describe('assertOwned', () => {
  it('пропускает, когда все id принадлежат userId', async () => {
    const model = fakeModel({ u1: ['a', 'b', 'c'] })
    await expect(assertOwned(model, 'u1', ['a', 'b'], 'нет')).resolves.toBeUndefined()
  })

  it('бросает NotFoundException, если хоть один id чужой', async () => {
    const model = fakeModel({ u1: ['a'], u2: ['x'] })
    await expect(assertOwned(model, 'u1', ['a', 'x'], 'Группа не найдена')).rejects.toThrow(
      NotFoundException,
    )
  })

  it('бросает, если id вообще не существует', async () => {
    const model = fakeModel({ u1: ['a'] })
    await expect(assertOwned(model, 'u1', ['missing'], 'нет')).rejects.toThrow(NotFoundException)
  })

  it('пустой список — no-op, count не вызывается', async () => {
    const model = fakeModel({ u1: ['a'] })
    await assertOwned(model, 'u1', [], 'нет')
    expect(model.calls).toBe(0)
  })

  it('отсеивает null/undefined', async () => {
    const model = fakeModel({ u1: ['a'] })
    await expect(assertOwned(model, 'u1', [null, 'a', undefined], 'нет')).resolves.toBeUndefined()
  })

  it('дедуп: повторяющийся свой id проходит', async () => {
    const model = fakeModel({ u1: ['a'] })
    await expect(assertOwned(model, 'u1', ['a', 'a'], 'нет')).resolves.toBeUndefined()
  })

  it('только null/undefined — no-op без обращения к модели', async () => {
    const model = fakeModel({ u1: ['a'] })
    await assertOwned(model, 'u1', [null, undefined], 'нет')
    expect(model.calls).toBe(0)
  })
})

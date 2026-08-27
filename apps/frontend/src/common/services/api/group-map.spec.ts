import { fetchGroupsRaw, getGroupMaps, invalidateGroupMap } from './group-map'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('common/services/api/api-client', () => ({
  apiClient: { get, post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const GROUPS = [
  { id: 'uuid-1', name: 'Старт' },
  { id: 'uuid-2', name: 'Акробатика' },
]

beforeEach(() => {
  get.mockReset()
  invalidateGroupMap()
})

describe('fetchGroupsRaw', () => {
  it('успешный ответ кэшируется: второй вызов не идёт в сеть', async () => {
    get.mockResolvedValue(GROUPS)
    await fetchGroupsRaw()
    await fetchGroupsRaw()
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('сбой НЕ кэшируется: следующий вызов пробует снова и выздоравливает', async () => {
    get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchGroupsRaw()).rejects.toThrow('Network Error')

    get.mockResolvedValue(GROUPS)
    await expect(fetchGroupsRaw()).resolves.toEqual(GROUPS)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('после сбоя карта имён строится корректно (экраны оживают без перезагрузки)', async () => {
    get.mockRejectedValueOnce(new Error('offline'))
    await expect(getGroupMaps()).rejects.toThrow('offline')

    get.mockResolvedValue(GROUPS)
    const { byId, byName } = await getGroupMaps()
    expect(byId.get('uuid-1')).toBe('Старт')
    expect(byName.get('Акробатика')).toBe('uuid-2')
  })

  it('invalidateGroupMap заставляет перечитать список', async () => {
    get.mockResolvedValue(GROUPS)
    await fetchGroupsRaw()
    invalidateGroupMap()
    await fetchGroupsRaw()
    expect(get).toHaveBeenCalledTimes(2)
  })
})

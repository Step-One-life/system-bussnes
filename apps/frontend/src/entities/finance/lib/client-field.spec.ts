import { resolveInitialClient } from './client-field'

import { describe, expect, it } from 'vitest'

const GROUPS = [
  { id: 'g-uuid-1', name: 'Атланты' },
  { id: 'g-uuid-2', name: 'Юниоры 2014' },
]

describe('resolveInitialClient', () => {
  it('ученик задан → режим student, имя группы null', () => {
    expect(resolveInitialClient('s-1', null, GROUPS)).toEqual({
      mode: 'student',
      studentId: 's-1',
      groupName: null,
    })
  })

  it('группа задана (UUID есть в списке) → режим group, имя резолвится, ученик обнуляется', () => {
    expect(resolveInitialClient(null, 'g-uuid-1', GROUPS)).toEqual({
      mode: 'group',
      studentId: null,
      groupName: 'Атланты',
    })
  })

  it('группа удалена (UUID не найден) → режим group, имя null', () => {
    expect(resolveInitialClient(null, 'g-gone', GROUPS)).toEqual({
      mode: 'group',
      studentId: null,
      groupName: null,
    })
  })

  it('ничего не привязано → режим student с пустыми значениями', () => {
    expect(resolveInitialClient(null, null, GROUPS)).toEqual({
      mode: 'student',
      studentId: null,
      groupName: null,
    })
  })

  it('заданы и ученик, и группа → группа имеет приоритет, ученик обнуляется', () => {
    expect(resolveInitialClient('s-1', 'g-uuid-2', GROUPS)).toEqual({
      mode: 'group',
      studentId: null,
      groupName: 'Юниоры 2014',
    })
  })
})

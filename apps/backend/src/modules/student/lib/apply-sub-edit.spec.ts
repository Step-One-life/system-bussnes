import { applySubEdit } from './apply-sub-edit'
import type { SubEditState } from './apply-sub-edit'

const base: SubEditState = {
  total: 8,
  remaining: 5,
  isActive: true,
  expiresAt: '2026-07-01',
  groupId: 'A',
  groupIds: ['A'],
  isUnlimited: false,
}

describe('applySubEdit', () => {
  it('перебор: newTotal < used → ошибка min с числом использованных', () => {
    // used = 8 - 5 = 3; ставим total = 2 < 3
    const res = applySubEdit(base, { total: 2 })
    expect(res).toEqual({ ok: false, reason: 'min', used: 3 })
  })

  it('количество: remaining = newTotal − used (used сохраняется)', () => {
    const res = applySubEdit(base, { total: 12 })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.total).toBe(12)
      expect(res.state.remaining).toBe(9) // 12 − 3
      expect(res.state.isActive).toBe(true)
    }
  })

  it('уменьшение ровно до использованных → remaining 0, isActive false', () => {
    const res = applySubEdit(base, { total: 3 }) // used = 3
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.remaining).toBe(0)
      expect(res.state.isActive).toBe(false)
    }
  })

  it('isActive по ИТОГОВОМУ остатку: правка даты+количества реанимирует пустой', () => {
    const empty: SubEditState = { ...base, total: 4, remaining: 0, isActive: false } // used = 4
    const res = applySubEdit(empty, { total: 8, expiresAt: '2026-12-31' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.remaining).toBe(4) // 8 − 4
      expect(res.state.isActive).toBe(true) // ожил по итоговому остатку
      expect(res.state.expiresAt).toBe('2026-12-31')
    }
  })

  it('безлимит: total/remaining/isActive не трогаются, меняется только дата', () => {
    const unl: SubEditState = { ...base, isUnlimited: true, remaining: 8 }
    const res = applySubEdit(unl, { total: 2, expiresAt: '2026-12-31' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.total).toBe(8) // не изменилось
      expect(res.state.remaining).toBe(8)
      expect(res.state.isActive).toBe(true)
      expect(res.state.expiresAt).toBe('2026-12-31')
    }
  })

  it('состав групп: выпавший groupId → groupId = groupIds[0]', () => {
    const res = applySubEdit(base, { groupIds: ['B', 'C'] })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.groupId).toBe('B')
      expect(res.state.groupIds).toEqual(['B', 'C'])
    }
  })

  it('состав групп: текущий groupId остаётся, если он в наборе', () => {
    const res = applySubEdit(base, { groupIds: ['B', 'A'] })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.state.groupId).toBe('A')
  })

  it('только дата: остаток/активность не меняются', () => {
    const res = applySubEdit(base, { expiresAt: '2026-09-01' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.remaining).toBe(5)
      expect(res.state.isActive).toBe(true)
      expect(res.state.total).toBe(8)
    }
  })
})

import { findConflicts } from './training-logic'

import type { Training } from './types'
import type { Group } from 'entities/groups/model/types'

import { describe, expect, it } from 'vitest'

function group(over: Partial<Group>): Group {
  return {
    id: 'g1',
    name: 'Акро',
    schedule: [],
    duration: 60,
    isIndividual: false,
    locationId: null,
    expiresAt: null,
    createdAt: '',
    ...over,
  }
}

function training(over: Partial<Training>): Training {
  return {
    id: 't1',
    date: '2026-07-01',
    time: '10:00',
    groupId: 'Акро',
    locationId: null,
    attendees: [],
    note: '',
    isPrime: false,
    sessionDuration: 60,
    recurring: false,
    recurringId: null,
    isOnline: false,
    plannedStudentId: null,
    isPair: false,
    plannedStudentId2: null,
    createdAt: '',
    ...over,
  }
}

// M4: длительность УЖЕ записанного занятия в проверке наслоения берётся из
// t.sessionDuration (как у бэка training-overlap.ts: `t.sessionDuration || 60`),
// а НЕ из group.duration. Иначе при sessionDuration ≠ group.duration фронтовый
// барьер расходился бы с серверным 409.
describe('findConflicts — источник длительности существующего занятия', () => {
  const date = '2026-07-01'
  const candidateGroup = 'НоваяГруппа'

  it('использует t.sessionDuration (а не больший group.duration) — нет ложного 409', () => {
    // Группа 90 мин, но занятие записано с sessionDuration=60 → окно [10:00,11:00).
    // Кандидат 11:05 НЕ пересекается. Старый код (group.duration=90, окно до 11:30)
    // дал бы ложный конфликт; бэк (sessionDuration=60) конфликта не видит.
    const existing = [training({ sessionDuration: 60 })]
    const groups = [group({ duration: 90 })]
    const map = { Акро: groups[0] }
    const conflicts = findConflicts(existing, groups, map, date, '11:05', candidateGroup, [], 30)
    expect(conflicts).toHaveLength(0)
  })

  it('использует t.sessionDuration (а не меньший group.duration) — ловит реальный 409', () => {
    // Группа 60 мин, но занятие записано с sessionDuration=90 → окно [10:00,11:30).
    // Кандидат 11:15 пересекается. Старый код (group.duration=60, окно до 11:00)
    // пропустил бы конфликт (ложный негатив); бэк (sessionDuration=90) его видит.
    const existing = [training({ sessionDuration: 90 })]
    const groups = [group({ duration: 60 })]
    const map = { Акро: groups[0] }
    const conflicts = findConflicts(existing, groups, map, date, '11:15', candidateGroup, [], 30)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].groupId).toBe('Акро')
  })

  it('обнаруживает пересечение в пределах sessionDuration', () => {
    const existing = [training({ sessionDuration: 60 })]
    const groups = [group({ duration: 60 })]
    const map = { Акро: groups[0] }
    const conflicts = findConflicts(existing, groups, map, date, '10:50', candidateGroup, [], 30)
    expect(conflicts).toHaveLength(1)
  })

  it('исключает занятие по excludeIds', () => {
    const existing = [training({ sessionDuration: 60 })]
    const groups = [group({ duration: 60 })]
    const map = { Акро: groups[0] }
    const conflicts = findConflicts(existing, groups, map, date, '10:50', candidateGroup, ['t1'], 30)
    expect(conflicts).toHaveLength(0)
  })
})

import { useMemo } from 'react'

import { groupStats } from 'common/lib/kpi'
import { useStudents } from 'entities/students/api/use-students'

import type { GroupStats } from 'common/lib/kpi'

/**
 * Статистика группы — производная от общего кэша учеников, а не отдельный
 * запрос под собственным ключом: теперь любая инвалидация studentKeys
 * (продление, отметка, добавление в группу) обновляет плитки сразу.
 */
export function useGroupStats(groupName: string): GroupStats {
  const { data: students = [] } = useStudents()
  return useMemo(() => groupStats(students, groupName), [students, groupName])
}

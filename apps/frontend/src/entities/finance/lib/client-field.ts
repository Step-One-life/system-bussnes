import type { Group } from 'entities/groups'

export type ClientMode = 'student' | 'group'

export interface InitialClient {
  mode: ClientMode
  /** UUID ученика для режима «Клиент» (null в режиме «Группа»). */
  studentId: string | null
  /** ИМЯ группы для режима «Группа» (null в режиме «Клиент»). */
  groupName: string | null
}

type GroupRef = Pick<Group, 'id' | 'name'>

/**
 * Начальное состояние поля «Клиент» для редактирования записи.
 * На входе — то, что хранит запись: studentId (UUID) и groupId (UUID).
 * Режим выбирается по наличию группы; UUID группы резолвится в ИМЯ для UI
 * (форма и селектор оперируют именами групп). Неизвестная группа (удалена) →
 * groupName null, но режим остаётся «Группа».
 */
export function resolveInitialClient(
  studentId: string | null,
  groupId: string | null,
  groups: GroupRef[],
): InitialClient {
  if (groupId) {
    const groupName = groups.find((g) => g.id === groupId)?.name ?? null
    return { mode: 'group', studentId: null, groupName }
  }
  return { mode: 'student', studentId: studentId ?? null, groupName: null }
}

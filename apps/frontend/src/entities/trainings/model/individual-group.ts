import find from 'lodash/find'

import { createGroup, getGroups } from 'entities/groups/model/groups.repo'

import type { Group } from 'entities/groups/model/types'

// Single-flight: пока создание группы «Индивидуальные» в полёте, переиспользуем
// один и тот же Promise. React StrictMode (и любой двойной маунт) иначе зовёт
// эффект дважды → два параллельных POST /groups → гонка на уникальном индексе
// (user_id, name) и разовая 500 у проигравшего запроса.
let inflightCreate: Promise<Group> | null = null

/** Get the individual group, creating it if it does not exist yet. */
export async function ensureIndividualGroup(): Promise<Group> {
  const groups = await getGroups()
  const existing = find(groups, (g) => g.isIndividual)
  if (existing) return existing
  if (inflightCreate) return inflightCreate
  inflightCreate = createGroup({
    name: 'Индивидуальные',
    schedule: [],
    duration: 60,
    isIndividual: true,
  }).finally(() => {
    inflightCreate = null
  })
  return inflightCreate
}

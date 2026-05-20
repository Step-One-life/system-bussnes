import find from 'lodash/find'

import { createGroup, getGroups } from 'entities/groups/model/groups.repo'

import type { Group } from 'entities/groups/model/types'

/** Get the individual group, creating it if it does not exist yet. */
export async function ensureIndividualGroup(): Promise<Group> {
  const groups = await getGroups()
  const existing = find(groups, (g) => g.isIndividual)
  if (existing) return existing
  return createGroup({
    name: 'Индивидуальные',
    schedule: [],
    duration: 60,
    isIndividual: true,
  })
}

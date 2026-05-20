import filter from 'lodash/filter'
import find from 'lodash/find'
import map from 'lodash/map'

import type { Group } from 'entities/groups/model/types'

/** A training is individual if its group is flagged individual or is unknown. */
export function isIndividualTraining(groupId: string, groups: Group[]): boolean {
  const group = find(groups, (g) => g.name === groupId)
  if (group) return group.isIndividual
  return true
}

/** Names of individual groups. */
export function getIndividualGroupNames(groups: Group[]): string[] {
  return map(
    filter(groups, (g) => g.isIndividual),
    (g) => g.name,
  )
}

/** Names of regular (non-individual) groups. */
export function getRegularGroupNames(groups: Group[]): string[] {
  return map(
    filter(groups, (g) => !g.isIndividual),
    (g) => g.name,
  )
}

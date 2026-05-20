import { apiClient } from './api-client'

import type { Group } from 'entities/groups/model/types'

/**
 * The backend identifies groups by UUID, but the frontend domain model uses
 * group NAMES as the identifier (`student.groups`, `subscription.groupId`,
 * `training.groupId`, `visit.groupId`). These helpers translate between the
 * two by loading the user's group list.
 *
 * The list is cached for the lifetime of the page; `invalidateGroupMap()`
 * clears it after any group mutation.
 */
let cache: Promise<Group[]> | null = null

export function fetchGroupsRaw(): Promise<Group[]> {
  if (!cache) cache = apiClient.get<Group[]>('/groups')
  return cache
}

export function invalidateGroupMap(): void {
  cache = null
}

/** Map group UUID → group name. Unknown ids fall through unchanged. */
export async function idToName(id: string | null | undefined): Promise<string> {
  if (!id) return ''
  const groups = await fetchGroupsRaw()
  return groups.find((g) => g.id === id)?.name ?? id
}

/** Map group name → group UUID. Unknown names fall through unchanged. */
export async function nameToId(name: string | null | undefined): Promise<string> {
  if (!name) return ''
  const groups = await fetchGroupsRaw()
  return groups.find((g) => g.name === name)?.id ?? name
}

/** Build both lookup maps in one pass (avoids repeated fetches). */
export async function getGroupMaps(): Promise<{
  byId: Map<string, string>
  byName: Map<string, string>
}> {
  const groups = await fetchGroupsRaw()
  const byId = new Map<string, string>()
  const byName = new Map<string, string>()
  for (const g of groups) {
    byId.set(g.id, g.name)
    byName.set(g.name, g.id)
  }
  return { byId, byName }
}

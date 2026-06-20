import filter from 'lodash/filter'
import map from 'lodash/map'

import { apiClient } from 'common/services/api/api-client'
import { fetchGroupsRaw, invalidateGroupMap } from 'common/services/api/group-map'

import type { Group, GroupInput } from './types'

export async function getGroups(): Promise<Group[]> {
  return fetchGroupsRaw()
}

export async function getIndividualGroups(): Promise<Group[]> {
  const groups = await getGroups()
  return filter(groups, (g) => g.isIndividual)
}

export async function getGroupById(id: string): Promise<Group | null> {
  const groups = await getGroups()
  return groups.find((g) => g.id === id) ?? null
}

export async function createGroup(data: GroupInput): Promise<Group> {
  const group = await apiClient.post<Group>('/groups', {
    name: data.name,
    schedule: data.schedule ?? [],
    duration: data.duration ?? 60,
    isIndividual: data.isIndividual ?? false,
    locationId: data.locationId ?? null,
    expiresAt: data.expiresAt ?? null,
  })
  invalidateGroupMap()
  return group
}

export async function updateGroup(id: string, changes: Partial<Group>): Promise<Group | null> {
  const body: Record<string, unknown> = {}
  if (changes.schedule !== undefined) body.schedule = changes.schedule
  if (changes.duration !== undefined) body.duration = changes.duration
  if (changes.isIndividual !== undefined) body.isIndividual = changes.isIndividual
  if (changes.locationId !== undefined) body.locationId = changes.locationId
  if (changes.expiresAt !== undefined) body.expiresAt = changes.expiresAt
  const group = await apiClient.patch<Group>(`/groups/${id}`, body)
  invalidateGroupMap()
  return group
}

export async function deleteGroup(id: string): Promise<boolean> {
  await apiClient.delete(`/groups/${id}`)
  invalidateGroupMap()
  return true
}

// Names of regular (non-individual) groups.
export async function getRegularGroupNames(): Promise<string[]> {
  const groups = await getGroups()
  return map(
    filter(groups, (g) => !g.isIndividual),
    (g) => g.name,
  )
}

// Names of individual groups.
export async function getIndividualGroupNames(): Promise<string[]> {
  const groups = await getGroups()
  return map(
    filter(groups, (g) => g.isIndividual),
    (g) => g.name,
  )
}

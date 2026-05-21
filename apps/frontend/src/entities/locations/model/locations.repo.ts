import isNil from 'lodash/isNil'
import map from 'lodash/map'

import { apiClient } from 'common/services/api/api-client'

import type { Location, LocationChanges, LocationInput } from './types'

/**
 * The backend speaks camelCase; the frontend domain model matches it here
 * (Location uses camelCase fields). The repo still normalises nullable fields
 * and centralises the API boundary.
 */
interface RawLocation {
  id: string
  name: string
  address: string | null
  kind: Location['kind']
  isDefault: boolean
  archived: boolean
  createdAt: string
}

function toLocation(raw: RawLocation): Location {
  return {
    id: raw.id,
    name: raw.name,
    address: raw.address ?? null,
    kind: raw.kind,
    isDefault: !!raw.isDefault,
    archived: !!raw.archived,
    createdAt: raw.createdAt,
  }
}

/** Cached location list, shared across the page lifetime. */
let cache: Promise<Location[]> | null = null

export function invalidateLocations(): void {
  cache = null
}

export async function getLocations(): Promise<Location[]> {
  if (!cache) {
    cache = apiClient
      .get<RawLocation[]>('/locations')
      .then((raw) => map(raw, toLocation))
  }
  return cache
}

export async function getLocationById(id: string): Promise<Location | null> {
  const locations = await getLocations()
  return locations.find((l) => l.id === id) ?? null
}

/** Returns the user's default location, or the first one as a fallback. */
export async function getDefaultLocation(): Promise<Location | null> {
  const locations = await getLocations()
  return locations.find((l) => l.isDefault) ?? locations[0] ?? null
}

export async function createLocation(data: LocationInput): Promise<Location> {
  const raw = await apiClient.post<RawLocation>('/locations', {
    name: data.name,
    address: data.address ?? null,
    kind: data.kind ?? 'hall',
    isDefault: data.isDefault ?? false,
  })
  invalidateLocations()
  return toLocation(raw)
}

export async function updateLocation(
  id: string,
  changes: LocationChanges,
): Promise<Location | null> {
  const body: Record<string, unknown> = {}
  if (!isNil(changes.name)) body.name = changes.name
  if (changes.address !== undefined) body.address = changes.address
  if (!isNil(changes.kind)) body.kind = changes.kind
  if (!isNil(changes.isDefault)) body.isDefault = changes.isDefault
  if (!isNil(changes.archived)) body.archived = changes.archived
  const raw = await apiClient.patch<RawLocation>(`/locations/${id}`, body)
  invalidateLocations()
  return toLocation(raw)
}

export async function deleteLocation(id: string): Promise<boolean> {
  await apiClient.delete(`/locations/${id}`)
  invalidateLocations()
  return true
}

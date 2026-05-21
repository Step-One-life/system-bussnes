import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from 'entities/locations/model/locations.repo'

import type { LocationChanges, LocationInput } from 'entities/locations/model/types'

export const locationKeys = {
  all: ['locations', 'all'] as const,
}

export function useLocations() {
  return useQuery({ queryKey: locationKeys.all, queryFn: getLocations })
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LocationInput) => createLocation(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  })
}

export function useUpdateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: LocationChanges }) =>
      updateLocation(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  })
}

export function useDeleteLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createGroup,
  deleteGroup,
  getGroups,
  updateGroup,
} from 'entities/groups/model/groups.repo'

import type { Group, GroupInput } from 'entities/groups/model/types'

export const groupKeys = {
  all: ['groups', 'all'] as const,
}

export function useGroups() {
  return useQuery({ queryKey: groupKeys.all, queryFn: getGroups })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GroupInput) => createGroup(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all }),
  })
}

export function useUpdateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<Group> }) =>
      updateGroup(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all }),
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all }),
  })
}

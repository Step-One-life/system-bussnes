import { useQuery } from '@tanstack/react-query'

import { getGroupStats } from 'common/lib/kpi'

export function useGroupStats(groupName: string) {
  return useQuery({
    queryKey: ['groups', groupName, 'stats'],
    queryFn: () => getGroupStats(groupName),
  })
}

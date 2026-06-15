import { apiClient } from 'common/services/api/api-client'

import type { ActivityEntry } from './types'

interface ActivityPage {
  data: ActivityEntry[]
  nextCursor: string | null
}

export async function getActivityLog(cursor: string | null): Promise<ActivityPage> {
  return apiClient.get<ActivityPage>('/activity-log', cursor ? { cursor } : undefined)
}

export async function undoEvent(id: string): Promise<void> {
  await apiClient.post(`/activity-log/${id}/undo`)
}

export async function undoBatch(batchId: string): Promise<void> {
  await apiClient.post(`/activity-log/batch/${batchId}/undo`)
}

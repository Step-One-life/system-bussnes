export interface ScheduleEntry {
  day: string
  time: string
}

export interface Group {
  id: string
  name: string
  schedule: ScheduleEntry[]
  duration: number
  isIndividual: boolean
  locationId: string | null
  /** Срок годности (YYYY-MM-DD, вкл.). null — бессрочная группа. */
  expiresAt: string | null
  createdAt: string
}

export interface GroupInput {
  name: string
  schedule?: ScheduleEntry[]
  duration?: number
  isIndividual?: boolean
  locationId?: string | null
  expiresAt?: string | null
}

export interface GroupStats {
  total: number
  active: number
  ending: number
  expired: number
}

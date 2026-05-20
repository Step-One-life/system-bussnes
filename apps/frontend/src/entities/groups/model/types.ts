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
  createdAt: string
}

export interface GroupInput {
  name: string
  schedule?: ScheduleEntry[]
  duration?: number
  isIndividual?: boolean
}

export interface GroupStats {
  total: number
  active: number
  ending: number
  expired: number
}

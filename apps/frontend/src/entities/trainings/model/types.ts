export interface Training {
  id: string
  date: string
  time: string
  groupId: string
  attendees: string[]
  note: string
  isPrime: boolean
  sessionDuration: number
  recurring: boolean
  recurringId: string | null
  createdAt: string
}

export interface TrainingInput {
  date: string
  time?: string
  groupId: string
  attendees?: string[]
  note?: string
  isPrime?: boolean
  sessionDuration?: number
  recurring?: boolean
  recurringId?: string | null
}

export interface TrainingConflict {
  groupId: string
  start: string
  end: string
}

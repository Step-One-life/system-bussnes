export interface Training {
  id: string
  date: string
  time: string
  groupId: string
  locationId: string | null
  attendees: string[]
  note: string
  isPrime: boolean
  sessionDuration: number
  recurring: boolean
  recurringId: string | null
  isOnline: boolean
  /** Запланированный клиент для будущего занятия, ещё не списанного. */
  plannedStudentId: string | null
  createdAt: string
}

export interface TrainingInput {
  date: string
  time?: string
  groupId: string
  locationId?: string | null
  attendees?: string[]
  note?: string
  isPrime?: boolean
  sessionDuration?: number
  recurring?: boolean
  recurringId?: string | null
  isOnline?: boolean
  plannedStudentId?: string | null
}

export interface TrainingConflict {
  groupId: string
  start: string
  end: string
}

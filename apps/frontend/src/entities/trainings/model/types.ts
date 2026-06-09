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
  /** Парная (сплит) тренировка на двух учеников. */
  isPair: boolean
  /** Второй плановый ученик парной тренировки. */
  plannedStudentId2: string | null
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
  isPair?: boolean
  plannedStudentId2?: string | null
}

export interface TrainingConflict {
  groupId: string
  start: string
  end: string
}

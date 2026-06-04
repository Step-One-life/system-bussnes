export interface EventBuilderInput {
  eventId: string
  groupName: string | null
  studentName: string | null
  date: string // YYYY-MM-DD
  time: string // HH:mm
  durationMin: number
  locationName: string | null
  locationAddress: string | null
  note: string
  isOnline: boolean
  isPrime: boolean
  trainingId: string
  timeZone: string
}

export interface GoogleEventResource {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  extendedProperties?: { private?: Record<string, string> }
}

/** Конец занятия как настенное время (с переносом даты через полночь). */
export function computeEndTime(
  date: string,
  time: string,
  durationMin: number,
): { date: string; time: string } {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + durationMin
  const dayShift = Math.floor(total / (24 * 60))
  const minOfDay = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const hh = String(Math.floor(minOfDay / 60)).padStart(2, '0')
  const mm = String(minOfDay % 60).padStart(2, '0')
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dayShift)
  const endDate = d.toISOString().slice(0, 10)
  return { date: endDate, time: `${hh}:${mm}` }
}

export function buildEventResource(input: EventBuilderInput): GoogleEventResource {
  const summary = input.studentName ?? input.groupName ?? 'Тренировка'
  const end = computeEndTime(input.date, input.time, input.durationMin)

  const location = input.isOnline
    ? 'Онлайн'
    : [input.locationName, input.locationAddress].filter(Boolean).join(', ') || undefined

  const descParts: string[] = []
  if (input.note) descParts.push(input.note)
  if (input.isPrime) descParts.push('Прайм-тайм')

  return {
    id: input.eventId,
    summary,
    description: descParts.length ? descParts.join('\n') : undefined,
    location,
    start: { dateTime: `${input.date}T${input.time}:00`, timeZone: input.timeZone },
    end: { dateTime: `${end.date}T${end.time}:00`, timeZone: input.timeZone },
    extendedProperties: { private: { trainingId: input.trainingId } },
  }
}

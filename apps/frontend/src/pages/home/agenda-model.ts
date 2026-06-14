import type { Group } from 'entities/groups'
import type { CalendarBlock, Training } from 'entities/trainings'

export type AgendaTypeKey = 'group' | 'individual' | 'pair' | 'online'

export interface AgendaItem {
  block: CalendarBlock
  startMin: number
  endMin: number
  typeKey: AgendaTypeKey
}

/** Минуты с начала суток. */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/**
 * Строки агенды из блоков дневного календаря: время начала/конца в минутах
 * суток и тип занятия. Длительность — занятия, иначе группы, иначе час.
 */
export function buildAgendaItems(
  rows: CalendarBlock[],
  trainings: Training[],
  groups: Group[],
): AgendaItem[] {
  const trainingById = new Map(trainings.map((t) => [t.id, t]))
  const groupByName = new Map(groups.map((g) => [g.name, g]))

  return rows.map((block) => {
    const [hh, mm] = block.time.split(':').map(Number)
    const startMin = hh * 60 + (mm || 0)
    const training = block.trainingId ? trainingById.get(block.trainingId) : undefined
    const duration =
      training?.sessionDuration || groupByName.get(block.groupId)?.duration || 60
    const typeKey: AgendaTypeKey = !block.isInd
      ? 'group'
      : training?.isPair
        ? 'pair'
        : training?.isOnline
          ? 'online'
          : 'individual'
    return { block, startMin, endMin: startMin + duration, typeKey }
  })
}

/** Занятие требует отметки: уже началось, а посещения не проставлены. */
export function needsMark(item: AgendaItem, nowMin: number): boolean {
  return item.startMin <= nowMin && item.block.attendeesCount === 0
}

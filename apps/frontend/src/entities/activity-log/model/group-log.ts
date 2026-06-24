import type { ActivityEntry } from './types'

export interface SingleItem {
  kind: 'single'
  event: ActivityEntry
}

export interface BatchItem {
  kind: 'batch'
  batchId: string
  children: ActivityEntry[]
}

export type LogItem = SingleItem | BatchItem

export interface LogDay {
  date: string
  items: LogItem[]
}

/** Локальная дата YYYY-MM-DD из ISO. */
function localDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Группирует уже отсортированные по убыванию события: сначала по локальному дню,
 * внутри дня — последовательные события с одним batchId в пакет (пакет из одного → single).
 */
export function groupByDayAndBatch(events: ActivityEntry[]): LogDay[] {
  const days: LogDay[] = []
  let curDay: LogDay | null = null
  // Карта batchId → пакет В ПРЕДЕЛАХ ТЕКУЩЕГО ДНЯ: события одного batchId
  // собираются в один пакет, даже если идут не подряд (между ними чужие
  // события — возможно при пагинации/курсоре). Раньше брался только последний
  // элемент дня, и непоследовательные события давали ДВА пакета с одинаковым
  // batchId → дублирующийся React key. Сбрасывается при смене дня, поэтому
  // разбивка одного batchId по разным дням сохраняется.
  let curBatches = new Map<string, BatchItem>()

  // Предподсчёт размеров пакетов, чтобы пакет из одного показать плоско.
  const batchCount = new Map<string, number>()
  for (const e of events) {
    if (e.batchId) batchCount.set(e.batchId, (batchCount.get(e.batchId) ?? 0) + 1)
  }

  for (const e of events) {
    const date = localDate(e.createdAt)
    if (!curDay || curDay.date !== date) {
      curDay = { date, items: [] }
      days.push(curDay)
      curBatches = new Map()
    }
    const isRealBatch = e.batchId && (batchCount.get(e.batchId) ?? 0) > 1
    if (isRealBatch) {
      const bid = e.batchId as string
      const existing = curBatches.get(bid)
      if (existing) {
        existing.children.push(e)
      } else {
        const item: BatchItem = { kind: 'batch', batchId: bid, children: [e] }
        curBatches.set(bid, item)
        curDay.items.push(item)
      }
    } else {
      curDay.items.push({ kind: 'single', event: e })
    }
  }
  return days
}

/** Ключ подписи пакета: серия занятий vs закрытие дня. */
export function batchLabelKey(children: ActivityEntry[]): string {
  return children.every((c) => c.type === 'training_created')
    ? 'journal.batchSeries'
    : 'journal.batchMarks'
}

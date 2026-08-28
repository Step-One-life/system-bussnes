import type { UnpaidSub } from './use-unpaid-subs'
import type { WarningEntry } from 'common/lib/kpi'
import type { LapsedEntry } from 'common/lib/lapsed'

/** Причина попадания в ленту, по убыванию серьёзности. */
export type AttentionReason = 'expired' | 'unpaid' | 'ending' | 'lapsed'

const RANK: Record<AttentionReason, number> = {
  expired: 0,
  unpaid: 1,
  ending: 2,
  lapsed: 3,
}

export interface AttentionItem {
  studentId: string
  name: string
  phone: string | null
  /** Все причины ученика — чипами в одной строке, без дублей плашек. */
  reasons: AttentionReason[]
  /** Худшая причина: по ней сортируем, красим и выбираем действие. */
  top: AttentionReason
  /** Данные для первичного действия. */
  warning: WarningEntry | null
  unpaid: UnpaidSub | null
  lapsedDays: number | null
  neverVisited: boolean
}

export const ATTENTION_LIMIT = 5

/**
 * Лента «Требуют внимания»: одна строка на УЧЕНИКА.
 *
 * Раньше пять источников выливались в колонку без дедупликации: ученик с
 * истёкшим и неоплаченным абонементом, который к тому же не приходил три недели,
 * давал три отдельные плашки. На демо-данных это 19 строк на 10 человек и три
 * экрана прокрутки — экран переставал быть списком приоритетов.
 */
export function buildAttentionFeed(
  warnings: WarningEntry[],
  unpaid: UnpaidSub[],
  lapsed: LapsedEntry[],
): AttentionItem[] {
  const byStudent = new Map<string, AttentionItem>()

  const touch = (id: string, name: string, phone: string | null): AttentionItem => {
    let item = byStudent.get(id)
    if (!item) {
      item = {
        studentId: id,
        name,
        phone,
        reasons: [],
        top: 'lapsed',
        warning: null,
        unpaid: null,
        lapsedDays: null,
        neverVisited: false,
      }
      byStudent.set(id, item)
    }
    return item
  }

  const addReason = (item: AttentionItem, reason: AttentionReason) => {
    if (!item.reasons.includes(reason)) item.reasons.push(reason)
    if (RANK[reason] < RANK[item.top] || item.reasons.length === 1) item.top = reason
  }

  for (const w of warnings) {
    const item = touch(w.student.id, w.student.name, w.student.phone)
    addReason(item, w.status.type === 'expired' ? 'expired' : 'ending')
    // Держим САМОЕ серьёзное предупреждение: по нему открывается продление.
    if (!item.warning || (w.status.type === 'expired' && item.warning.status.type !== 'expired')) {
      item.warning = w
    }
  }

  for (const u of unpaid) {
    const item = touch(u.student.id, u.student.name, u.student.phone)
    addReason(item, 'unpaid')
    item.unpaid ??= u
  }

  for (const l of lapsed) {
    const item = touch(l.student.id, l.student.name, l.student.phone)
    addReason(item, 'lapsed')
    item.lapsedDays = l.daysSince
    item.neverVisited = l.neverVisited
  }

  return [...byStudent.values()].sort(
    (a, b) => RANK[a.top] - RANK[b.top] || (b.lapsedDays ?? 0) - (a.lapsedDays ?? 0),
  )
}

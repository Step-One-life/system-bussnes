/**
 * Чистый пересчёт состояния абонемента при редактировании.
 *
 * Меняет ТОЛЬКО total/expiresAt/groupIds. Ключевые правила:
 * - isActive пересчитывается ОДИН раз по ИТОГОВОМУ остатку (а не по каждому
 *   полю) — иначе одновременная правка даты+количества могла бы оставить
 *   абонемент неактивным (зеркало семантики extendById «не реанимировать пустой»).
 * - Количество: used = total − remaining сохраняется; новый remaining =
 *   newTotal − used. Если newTotal < used — это перебор, остаток ушёл бы в минус.
 * - Безлимит (isUnlimited): total/remaining/isActive семантически пусты —
 *   не трогаем (меняем только дату/состав групп).
 * - groupId всегда остаётся внутри набора groupIds (иначе берём первый).
 */
export interface SubEditState {
  total: number
  remaining: number
  isActive: boolean
  expiresAt: string
  groupId: string
  groupIds: string[]
  isUnlimited: boolean
}

export interface SubEditFields {
  total?: number
  expiresAt?: string
  groupIds?: string[]
}

export type SubEditResult =
  | { ok: true; state: SubEditState }
  | { ok: false; reason: 'min'; used: number }

export function applySubEdit(cur: SubEditState, fields: SubEditFields): SubEditResult {
  const used = cur.total - cur.remaining
  let total = cur.total
  let remaining = cur.remaining
  let expiresAt = cur.expiresAt
  let groupId = cur.groupId
  let groupIds = cur.groupIds
  let isActive = cur.isActive

  // Количество — только для не-безлимита.
  if (fields.total !== undefined && !cur.isUnlimited) {
    if (fields.total < used) return { ok: false, reason: 'min', used }
    total = fields.total
    remaining = fields.total - used
  }

  // Дата — единственный источник срока.
  if (fields.expiresAt !== undefined) {
    expiresAt = fields.expiresAt
  }

  // Состав групп — groupId должен остаться в наборе.
  if (fields.groupIds !== undefined && fields.groupIds.length > 0) {
    groupIds = fields.groupIds
    if (!groupIds.includes(groupId)) groupId = groupIds[0]
  }

  // Финальный пересчёт активности по ИТОГОВОМУ остатку. Безлимит не трогаем.
  if (!cur.isUnlimited) {
    isActive = remaining > 0
  }

  return {
    ok: true,
    state: { total, remaining, isActive, expiresAt, groupId, groupIds, isUnlimited: cur.isUnlimited },
  }
}

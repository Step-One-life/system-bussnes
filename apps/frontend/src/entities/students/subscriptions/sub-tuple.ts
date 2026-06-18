import type { Subscription } from '../model/types'
import type { RuleTuple } from 'entities/finance/lib/pricing-lookup'
import type { LessonKind } from 'entities/finance/model/types'

/**
 * Кортеж тарифа для существующего абонемента — резолв цены и запись дохода без
 * опоры на жёсткий `SubscriptionType` (число занятий хранится в `total`).
 *
 * `lessonKind` из контекста группы: общий (несколько групп) → 'shared',
 * индивидуальная → 'individual', иначе → 'group'. Формат — по числу занятий
 * (>1 — абонемент, иначе разовое). Для легаси-пресетов 1/4/8 кортеж совпадает с
 * `subTypeToTuple`, поэтому тариф находится тот же (без регрессии).
 */
export function subTuple(
  sub: Pick<Subscription, 'total' | 'sessionDuration' | 'groupIds' | 'isPair'>,
  isIndividual: boolean,
): RuleTuple {
  const isShared = (sub.groupIds?.length ?? 0) > 1
  const lessonKind: LessonKind = sub.isPair
    ? 'pair'
    : isShared
      ? 'shared'
      : isIndividual
        ? 'individual'
        : 'group'
  return {
    lessonKind,
    format: sub.total > 1 ? 'subscription' : 'single',
    durationMinutes: sub.sessionDuration || 60,
    sessionsCount: sub.total,
  }
}

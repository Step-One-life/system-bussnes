import { formatDateShort } from 'common/utils/date'

import type { ActivityEntry, ActivityType } from './types'

export interface EventView {
  icon: string
  /** Готовая строка из данных (имя/группа), если перевод не нужен. */
  titleText?: string
  /** Ключ i18n, если заголовок переводимый. */
  titleKey?: string
  titleParams?: Record<string, string | number>
  /** Ключ i18n для детали (может отсутствовать). */
  detailKey?: string
  detailParams?: Record<string, string | number>
  /** Готовая строка детали из данных (дата/время), если перевод не нужен. */
  detailText?: string
  undoable: boolean
  undone: boolean
}

const ICONS: Record<ActivityType, string> = {
  attendance_marked: '✅',
  subscription_created: '🔄',
  subscription_deleted: '🗑',
  subscription_extended: '📅',
  subscription_edited: '✏️',
  session_deducted: '➖',
  payment_recorded: '💳',
  training_created: '➕',
  training_deleted: '🗑',
}

/** Типы без обратной операции (зеркало backend isUndoable). */
const VIEW_ONLY: ActivityType[] = [
  'training_deleted',
  'subscription_deleted',
  'subscription_extended',
  'subscription_edited',
  'session_deducted',
]

export function describeEvent(e: ActivityEntry): EventView {
  const s = e.summary
  const name = s.studentName ?? ''
  const group = s.groupName ?? ''
  const nameWithGroup = group ? `${name} · «${group}»` : name
  const undone = !!e.undoneAt
  const base = {
    icon: ICONS[e.type],
    undone,
    // View-only типы не откатываются (зеркало backend isUndoable).
    undoable: !VIEW_ONLY.includes(e.type) && !undone,
  }

  switch (e.type) {
    case 'attendance_marked':
      return {
        ...base,
        titleText: nameWithGroup,
        ...(s.billing === 'subscription'
          ? { detailKey: 'journal.icon.attendanceSub', detailParams: { count: s.remaining ?? 0 } }
          : s.billing === 'payment'
            ? { detailKey: 'journal.icon.attendancePay', detailParams: { amount: s.amount ?? 0 } }
            : {}),
      }
    case 'subscription_created':
      return {
        ...base,
        titleText: nameWithGroup,
        // С ценой — детализированный ключ (сумма видна в журнале), иначе обычный.
        detailKey:
          s.amount && s.amount > 0 ? 'journal.icon.subscriptionPriced' : 'journal.icon.subscription',
        detailParams: { count: s.sessionsCount ?? 0, amount: s.amount ?? 0 },
      }
    case 'subscription_deleted':
      return {
        ...base,
        titleKey: 'journal.icon.subscriptionDeleted',
        titleParams: { name: nameWithGroup },
      }
    case 'subscription_extended':
      return {
        ...base,
        titleKey: 'journal.icon.subscriptionExtended',
        titleParams: { name: nameWithGroup },
      }
    case 'subscription_edited':
      return {
        ...base,
        titleKey: 'journal.icon.subscriptionEdited',
        titleParams: { name: nameWithGroup },
      }
    case 'session_deducted':
      return {
        ...base,
        titleKey: 'journal.icon.sessionDeducted',
        titleParams: { name: nameWithGroup },
        ...(typeof s.remaining === 'number'
          ? { detailKey: 'journal.icon.sessionDeductedDetail', detailParams: { count: s.remaining } }
          : {}),
      }
    case 'payment_recorded':
      return {
        ...base,
        // Имя ученика, иначе — группа (доход в режиме «Группа»), иначе пусто.
        titleText: name || (group ? `«${group}»` : ''),
        detailKey: 'journal.icon.payment',
        detailParams: { amount: s.amount ?? 0 },
      }
    case 'training_created':
      return {
        ...base,
        titleKey: 'journal.icon.created',
        titleParams: { group },
      }
    case 'training_deleted': {
      // Кого/что удалили: имя ученика (индивидуальные/парные) или название группы.
      const who = s.studentName || (group ? `«${group}»` : '')
      // Серия отмечена sessionsCount (число удалённых занятий) — одиночное его не имеет.
      if (s.sessionsCount && s.sessionsCount > 0) {
        return {
          ...base,
          titleKey: 'journal.icon.deletedSeries',
          titleParams: { name: who },
          detailKey: 'journal.icon.deletedSeriesDetail',
          detailParams: { count: s.sessionsCount },
        }
      }
      const when = s.trainingDate
        ? `${formatDateShort(s.trainingDate)}${s.trainingTime ? ` · ${s.trainingTime}` : ''}`
        : ''
      return {
        ...base,
        titleKey: 'journal.icon.deleted',
        titleParams: { name: who },
        ...(when ? { detailText: when } : {}),
      }
    }
  }
}

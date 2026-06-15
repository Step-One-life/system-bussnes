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
  undoable: boolean
  undone: boolean
}

const ICONS: Record<ActivityType, string> = {
  attendance_marked: '✅',
  subscription_created: '🔄',
  payment_recorded: '💳',
  training_created: '➕',
  training_deleted: '🗑',
}

export function describeEvent(e: ActivityEntry): EventView {
  const s = e.summary
  const name = s.studentName ?? ''
  const group = s.groupName ?? ''
  const nameWithGroup = group ? `${name} · «${group}»` : name
  const undone = !!e.undoneAt
  const base = {
    icon: ICONS[e.type],
    undone,
    undoable: e.type !== 'training_deleted' && !undone,
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
        detailKey: 'journal.icon.subscription',
        detailParams: { count: s.sessionsCount ?? 0 },
      }
    case 'payment_recorded':
      return {
        ...base,
        titleText: name,
        detailKey: 'journal.icon.payment',
        detailParams: { amount: s.amount ?? 0 },
      }
    case 'training_created':
      return {
        ...base,
        titleKey: 'journal.icon.created',
        titleParams: { group },
      }
    case 'training_deleted':
      return {
        ...base,
        titleKey: 'journal.icon.deleted',
        titleParams: { group },
      }
  }
}

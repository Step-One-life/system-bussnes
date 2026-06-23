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
    // Удаление занятия и абонемента — view-only (не откатываются).
    undoable: e.type !== 'training_deleted' && e.type !== 'subscription_deleted' && !undone,
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
    case 'subscription_deleted':
      return {
        ...base,
        titleKey: 'journal.icon.subscriptionDeleted',
        titleParams: { name: nameWithGroup },
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

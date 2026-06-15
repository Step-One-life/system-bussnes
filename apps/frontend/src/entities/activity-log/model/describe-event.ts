import type { ActivityEntry, ActivityType } from './types'

export interface EventView {
  icon: string
  title: string
  detail: string
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
  let title = name
  let detail = ''
  switch (e.type) {
    case 'attendance_marked':
      title = group ? `${name} · «${group}»` : name
      detail =
        s.billing === 'subscription'
          ? `списано занятие, осталось ${s.remaining ?? 0}`
          : s.billing === 'payment'
            ? `платёж ${s.amount ?? 0} ₽`
            : 'без списания'
      break
    case 'subscription_created':
      title = group ? `${name} · «${group}»` : name
      detail = `абонемент ${s.sessionsCount ?? 0} занятий`
      break
    case 'payment_recorded':
      title = name
      detail = `оплата ${s.amount ?? 0} ₽`
      break
    case 'training_created':
      title = `Создано занятие «${group}»`
      detail = s.trainingTime ?? ''
      break
    case 'training_deleted':
      title = `Удалено занятие «${group}»`
      detail = s.trainingTime ?? ''
      break
  }
  return {
    icon: ICONS[e.type],
    title,
    detail,
    undoable: e.type !== 'training_deleted' && !e.undoneAt,
    undone: !!e.undoneAt,
  }
}

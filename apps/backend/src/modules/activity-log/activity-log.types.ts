import type { ActivityType } from '@trikick/shared'

/**
 * View-only типы — без обратной операции (откат не предлагается):
 * удаление занятия/абонемента и ручные корректировки абонемента
 * (продление срока, ручное списание занятия).
 */
const VIEW_ONLY: ActivityType[] = [
  'training_deleted',
  'subscription_deleted',
  'subscription_extended',
  'subscription_edited',
  'session_deducted',
]

export function isUndoable(type: ActivityType): boolean {
  return !VIEW_ONLY.includes(type)
}

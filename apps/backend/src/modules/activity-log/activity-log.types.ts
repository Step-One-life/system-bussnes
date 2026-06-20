import type { ActivityType } from '@trikick/shared'

/** Удаление занятия и абонемента — необратимые (view-only) типы. */
export function isUndoable(type: ActivityType): boolean {
  return type !== 'training_deleted' && type !== 'subscription_deleted'
}

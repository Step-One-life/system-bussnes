import type { ActivityType } from '@trikick/shared'

/** Удаление занятия — единственный необратимый (view-only) тип. */
export function isUndoable(type: ActivityType): boolean {
  return type !== 'training_deleted'
}

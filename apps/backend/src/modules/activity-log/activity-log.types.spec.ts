import { isUndoable } from './activity-log.types'

describe('isUndoable', () => {
  it('обратимые типы', () => {
    expect(isUndoable('attendance_marked')).toBe(true)
    expect(isUndoable('subscription_created')).toBe(true)
    expect(isUndoable('payment_recorded')).toBe(true)
    expect(isUndoable('training_created')).toBe(true)
  })

  it('удаление занятия — view-only', () => {
    expect(isUndoable('training_deleted')).toBe(false)
  })

  it('удаление абонемента и ручные корректировки — view-only', () => {
    expect(isUndoable('subscription_deleted')).toBe(false)
    expect(isUndoable('subscription_extended')).toBe(false)
    expect(isUndoable('subscription_edited')).toBe(false)
    expect(isUndoable('session_deducted')).toBe(false)
  })
})

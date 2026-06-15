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
})

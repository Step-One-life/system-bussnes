/**
 * Регресс (BY DESIGN): удаление ученика НЕ удаляет его платежи — финансовая
 * история сохраняется, у платежа лишь обнуляется student_id. Механизм —
 * FK payments.student_id с ON DELETE SET NULL (миграция add-fk-billing-links).
 * Тест фиксирует это намерение и упадёт, если кто-то сменит поведение на
 * CASCADE (платежи бы удалялись вместе с учеником) или уберёт FK.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration = require('../../../../database/migrations/20260611000002-add-fk-billing-links')

interface ConstraintOptions {
  fields: string[]
  references: { table: string; field: string }
  onDelete: string
}

describe('Удаление ученика сохраняет платёж (FK SET NULL)', () => {
  it('FK payments.student_id навешивается с onDelete=SET NULL на students', async () => {
    const calls: { table: string; options: ConstraintOptions }[] = []
    const queryInterface = {
      sequelize: { query: async () => undefined },
      addConstraint: async (table: string, options: ConstraintOptions) => {
        calls.push({ table, options })
      },
    }

    await migration.up(queryInterface)

    const fk = calls.find(
      (c) => c.table === 'payments' && c.options.fields.includes('student_id'),
    )
    expect(fk).toBeDefined()
    expect(fk?.options.references.table).toBe('students')
    // Ключевой инвариант: SET NULL (а не CASCADE) — платёж переживает ученика.
    expect(fk?.options.onDelete).toBe('SET NULL')
  })
})

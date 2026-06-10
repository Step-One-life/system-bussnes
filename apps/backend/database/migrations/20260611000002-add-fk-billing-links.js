'use strict'

/**
 * FK ON DELETE SET NULL на «биллинговые» ссылки, жившие без ограничений:
 * - visits.subscription_id / visits.payment_id — откат отметки больше не
 *   встретит висячий id (ручное удаление платежа в Финансах обнуляет ссылку);
 * - subscriptions.fin_payment_id — удалённый вручную платёж возвращает
 *   абонемент в «Ожидают оплаты» вместо вечного «оплачен» с висячей ссылкой;
 * - payments.student_id / hall_costs.student_id — удаление ученика сохраняет
 *   финансовую историю, но отвязывает её.
 * Перед навешиванием FK висячие ссылки обнуляются.
 */
const LINKS = [
  ['visits', 'subscription_id', 'subscriptions', 'fk_visits_subscription'],
  ['visits', 'payment_id', 'payments', 'fk_visits_payment'],
  ['subscriptions', 'fin_payment_id', 'payments', 'fk_subscriptions_fin_payment'],
  ['payments', 'student_id', 'students', 'fk_payments_student'],
  ['hall_costs', 'student_id', 'students', 'fk_hall_costs_student'],
]

module.exports = {
  async up(queryInterface) {
    for (const [table, column, target, name] of LINKS) {
      await queryInterface.sequelize.query(`
        UPDATE ${table} t
        LEFT JOIN ${target} r ON t.${column} = r.id
        SET t.${column} = NULL
        WHERE t.${column} IS NOT NULL AND r.id IS NULL
      `)
      await queryInterface.addConstraint(table, {
        fields: [column],
        type: 'foreign key',
        name,
        references: { table: target, field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      })
    }
  },

  async down(queryInterface) {
    for (const [table, , , name] of LINKS) {
      await queryInterface.removeConstraint(table, name)
    }
  },
}

'use strict'

/**
 * payments.group_id — привязка финансовой записи (дохода) к ГРУППЕ как
 * альтернатива student_id (доход с групповой/почасовой работы). Nullable,
 * FK→groups ON DELETE SET NULL: удаление группы сохраняет финансовую историю,
 * но отвязывает её. Старые записи остаются NULL (обратная совместимость).
 * Расход залу (hall_costs) сознательно не трогаем — группа = атрибут дохода.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payments', 'group_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'groups', key: 'id' },
      onDelete: 'SET NULL',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('payments', 'group_id')
  },
}

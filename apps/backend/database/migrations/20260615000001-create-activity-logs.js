'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activity_logs', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: { type: Sequelize.STRING, allowNull: false },
      batch_id: { type: Sequelize.UUID, allowNull: true },
      training_id: { type: Sequelize.UUID, allowNull: true },
      student_id: { type: Sequelize.UUID, allowNull: true },
      subscription_id: { type: Sequelize.UUID, allowNull: true },
      payment_id: { type: Sequelize.UUID, allowNull: true },
      summary: { type: Sequelize.JSON, allowNull: false },
      undone_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
    // Лента: выборка по владельцу в обратном хронопорядке.
    await queryInterface.addIndex('activity_logs', ['user_id', 'created_at'], {
      name: 'idx_activity_user_created',
    })
    // Группировка пакетов и markUndone по batch.
    await queryInterface.addIndex('activity_logs', ['batch_id'], {
      name: 'idx_activity_batch',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_logs')
  },
}

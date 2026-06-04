'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('calendar_sync_tasks', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false },
      training_id: { type: Sequelize.UUID, allowNull: false },
      operation: { type: Sequelize.STRING, allowNull: false },
      calendar_id: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      last_error: { type: Sequelize.TEXT, allowNull: true },
      run_after: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
    await queryInterface.addIndex('calendar_sync_tasks', ['status', 'run_after'])
    await queryInterface.addIndex('calendar_sync_tasks', ['training_id'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('calendar_sync_tasks')
  },
}

'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('calendar_connections', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false, unique: true },
      provider: { type: Sequelize.STRING, allowNull: false, defaultValue: 'google' },
      refresh_token_enc: { type: Sequelize.TEXT, allowNull: true },
      calendar_id: { type: Sequelize.STRING, allowNull: true },
      calendar_time_zone: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'disconnected' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('calendar_connections')
  },
}

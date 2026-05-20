'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hall_costs', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      student_id: { type: Sequelize.UUID, allowNull: true },
      hall_payment_type: { type: Sequelize.STRING, allowNull: false },
      time_slot: { type: Sequelize.STRING, allowNull: false, defaultValue: 'regular' },
      training_time: { type: Sequelize.STRING, allowNull: false, defaultValue: '' },
      hall_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      sessions_total: { type: Sequelize.INTEGER, allowNull: false },
      sessions_remaining: { type: Sequelize.INTEGER, allowNull: false },
      paid_at: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'active' },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.createTable('payments', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      student_id: { type: Sequelize.UUID, allowNull: true },
      client_payment_type: { type: Sequelize.STRING, allowNull: false },
      client_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      sessions_total: { type: Sequelize.INTEGER, allowNull: false },
      sessions_remaining: { type: Sequelize.INTEGER, allowNull: false },
      paid_at: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'active' },
      notes: { type: Sequelize.TEXT, allowNull: true },
      hall_cost_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'hall_costs', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.createTable('pricing', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      data: { type: Sequelize.JSON, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pricing')
    await queryInterface.dropTable('payments')
    await queryInterface.dropTable('hall_costs')
  },
}

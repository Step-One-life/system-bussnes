'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('students', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.createTable('student_groups', {
      student_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: { model: 'students', key: 'id' },
        onDelete: 'CASCADE',
      },
      group_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: { model: 'groups', key: 'id' },
        onDelete: 'CASCADE',
      },
    })

    await queryInterface.createTable('subscriptions', {
      id: { type: Sequelize.UUID, primaryKey: true },
      student_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'students', key: 'id' },
        onDelete: 'CASCADE',
      },
      group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'groups', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: { type: Sequelize.STRING, allowNull: false },
      total: { type: Sequelize.INTEGER, allowNull: false },
      remaining: { type: Sequelize.INTEGER, allowNull: false },
      expires_at: { type: Sequelize.DATEONLY, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      fin_payment_id: { type: Sequelize.UUID, allowNull: true },
      session_duration: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 60 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.createTable('visits', {
      id: { type: Sequelize.UUID, primaryKey: true },
      student_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'students', key: 'id' },
        onDelete: 'CASCADE',
      },
      group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'groups', key: 'id' },
        onDelete: 'CASCADE',
      },
      training_id: { type: Sequelize.UUID, allowNull: true },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('visits')
    await queryInterface.dropTable('subscriptions')
    await queryInterface.dropTable('student_groups')
    await queryInterface.dropTable('students')
  },
}

'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trainings', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'groups', key: 'id' },
        onDelete: 'CASCADE',
      },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      time: { type: Sequelize.STRING, allowNull: false, defaultValue: '' },
      note: { type: Sequelize.TEXT, allowNull: true },
      is_prime: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      session_duration: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 60 },
      recurring: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      recurring_id: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.createTable('training_attendees', {
      training_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: { model: 'trainings', key: 'id' },
        onDelete: 'CASCADE',
      },
      student_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: { model: 'students', key: 'id' },
        onDelete: 'CASCADE',
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('training_attendees')
    await queryInterface.dropTable('trainings')
  },
}

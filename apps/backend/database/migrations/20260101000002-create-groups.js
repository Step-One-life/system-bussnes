'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('groups', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING, allowNull: false },
      schedule: { type: Sequelize.JSON, allowNull: false },
      duration: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 60 },
      is_individual: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
    await queryInterface.addConstraint('groups', {
      fields: ['user_id', 'name'],
      type: 'unique',
      name: 'groups_user_name_unique',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('groups')
  },
}

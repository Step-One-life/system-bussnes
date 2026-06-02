'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trainings', 'is_online', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('trainings', 'is_online')
  },
}

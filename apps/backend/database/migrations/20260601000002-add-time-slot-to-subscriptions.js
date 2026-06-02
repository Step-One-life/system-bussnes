'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subscriptions', 'time_slot', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'regular',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subscriptions', 'time_slot')
  },
}

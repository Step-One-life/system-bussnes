'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subscriptions', 'group_ids', {
      type: Sequelize.JSON,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subscriptions', 'group_ids')
  },
}

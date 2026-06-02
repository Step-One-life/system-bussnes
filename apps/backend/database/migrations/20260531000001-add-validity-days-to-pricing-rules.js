'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pricing_rules', 'validity_days', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 35,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pricing_rules', 'validity_days')
  },
}

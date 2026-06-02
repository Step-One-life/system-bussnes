'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('locations', 'prime_weekday_start', {
      type: Sequelize.STRING(5),
      allowNull: true,
      defaultValue: null,
    })
    await queryInterface.addColumn('locations', 'prime_weekday_end', {
      type: Sequelize.STRING(5),
      allowNull: true,
      defaultValue: null,
    })
    await queryInterface.addColumn('locations', 'prime_weekend_start', {
      type: Sequelize.STRING(5),
      allowNull: true,
      defaultValue: null,
    })
    await queryInterface.addColumn('locations', 'prime_weekend_end', {
      type: Sequelize.STRING(5),
      allowNull: true,
      defaultValue: null,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('locations', 'prime_weekday_start')
    await queryInterface.removeColumn('locations', 'prime_weekday_end')
    await queryInterface.removeColumn('locations', 'prime_weekend_start')
    await queryInterface.removeColumn('locations', 'prime_weekend_end')
  },
}

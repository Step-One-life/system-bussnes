'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // billing: 'subscription' | 'payment' | 'none'; NULL = легаси-визит до миграции
    await queryInterface.addColumn('visits', 'billing', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('visits', 'subscription_id', {
      type: Sequelize.UUID,
      allowNull: true,
    })
    await queryInterface.addColumn('visits', 'payment_id', {
      type: Sequelize.UUID,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('visits', 'payment_id')
    await queryInterface.removeColumn('visits', 'subscription_id')
    await queryInterface.removeColumn('visits', 'billing')
  },
}

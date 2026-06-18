'use strict'

/**
 * subscriptions.is_unlimited — безлимитный абонемент: действует по сроку
 * (expires_at), при отметке засчитывается, но число занятий НЕ списывается
 * (remaining не трогается). Старые абонементы = false (обратная совместимость).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subscriptions', 'is_unlimited', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subscriptions', 'is_unlimited')
  },
}

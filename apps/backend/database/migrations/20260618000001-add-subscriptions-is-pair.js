'use strict'

/**
 * subscriptions.is_pair — признак «парного» абонемента. Парные/индивидуальные
 * занятия живут на одной скрытой группе-контейнере, поэтому без флага списание
 * не отличило бы парный абонемент от индивидуального. Списание парной тренировки
 * берёт только is_pair=true, остальные — is_pair=false. Старые абонементы = false
 * (обратная совместимость).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subscriptions', 'is_pair', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subscriptions', 'is_pair')
  },
}

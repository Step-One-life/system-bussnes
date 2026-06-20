'use strict'

/**
 * groups.expires_at — срок годности группы: дата, ДО которой (включительно)
 * группа активна. NULL = бессрочная (поведение по умолчанию, обратная
 * совместимость). После этой даты расписание группы не порождает занятий
 * (лента дня / «Закрыть день» / календарь), группа помечается «истекла»,
 * но данные, абонементы и история сохраняются.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('groups', 'expires_at', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('groups', 'expires_at')
  },
}

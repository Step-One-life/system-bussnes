'use strict'

/**
 * students.phone / students.note — контакты и заметка тренера об ученике.
 * Телефон хранится как введён (нормализация для ссылок — на фронте),
 * NULL = не указан. Заметка — свободный текст (особенности, травмы, родители).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('students', 'phone', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    })
    await queryInterface.addColumn('students', 'note', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('students', 'note')
    await queryInterface.removeColumn('students', 'phone')
  },
}

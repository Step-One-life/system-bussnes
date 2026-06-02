'use strict'

/**
 * Удаляет таблицу `pricing` — legacy-хранилище плоского словаря цен тренера
 * (Record<string, number>). Полностью заменено гибкими `pricing_rules`
 * (per-location, per-lesson-kind, validity_days) — см. plan-001 §8.
 *
 * Down — восстанавливает структуру из 20260101000005-create-finance.js, чтобы
 * откат миграционной цепочки не падал. Данные не восстанавливаются.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('pricing')
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('pricing', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      data: { type: Sequelize.JSON, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
  },
}

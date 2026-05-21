'use strict'

const { randomUUID } = require('crypto')

/**
 * Локации + гибкие тарифы (plan-001).
 *
 * 1. Создаёт таблицы `locations` и `pricing_rules`.
 * 2. Добавляет `location_id` в trainings / hall_costs / payments / groups.
 * 3. Data-миграция: для каждого тренера со строкой `pricing` создаёт
 *    локацию «Основной зал» и раскладывает плоский JSON-словарь цен в
 *    строки `pricing_rules`. Все существующие записи привязываются к
 *    дефолтной локации тренера.
 */

/**
 * Описание тарифа, получаемого из набора плоских ключей старого pricing.
 * clientKey — ключ цены клиента; hallBase — основа hall-ключа
 * (`hall_<base>_<slot>_price`).
 */
const RULE_MAP = [
  {
    title: 'Разовая индивидуальная',
    lessonKind: 'individual',
    format: 'single',
    durationMinutes: 60,
    sessionsCount: 1,
    clientKey: 'client_single_individual_price',
    hallBase: 'single_individual',
  },
  {
    title: 'Разовая групповая',
    lessonKind: 'group',
    format: 'single',
    durationMinutes: 60,
    sessionsCount: 1,
    clientKey: 'client_single_group_price',
    hallBase: 'single_group',
  },
  {
    title: 'Индив. абонемент 4',
    lessonKind: 'individual',
    format: 'subscription',
    durationMinutes: 60,
    sessionsCount: 4,
    clientKey: 'client_individual_sub_4_price',
    hallBase: 'individual_sub_4',
  },
  {
    title: 'Индив. абонемент 8',
    lessonKind: 'individual',
    format: 'subscription',
    durationMinutes: 60,
    sessionsCount: 8,
    clientKey: 'client_individual_sub_8_price',
    hallBase: 'individual_sub_8',
  },
  {
    title: 'Групп. абонемент 4',
    lessonKind: 'group',
    format: 'subscription',
    durationMinutes: 60,
    sessionsCount: 4,
    clientKey: 'client_group_sub_4_price',
    hallBase: 'group_sub_4',
  },
  {
    title: 'Групп. абонемент 8',
    lessonKind: 'group',
    format: 'subscription',
    durationMinutes: 60,
    sessionsCount: 8,
    clientKey: 'client_group_sub_8_price',
    hallBase: 'group_sub_8',
  },
  {
    title: 'Разовая индив. 1.5ч',
    lessonKind: 'individual',
    format: 'single',
    durationMinutes: 90,
    sessionsCount: 1,
    clientKey: 'client_single_individual_90_price',
    // 1.5ч переиспользовали 1ч-hall-тарифы (HALL_TYPE_ALIAS)
    hallBase: 'single_individual',
  },
  {
    title: 'Индив. абонемент 4 × 1.5ч',
    lessonKind: 'individual',
    format: 'subscription',
    durationMinutes: 90,
    sessionsCount: 4,
    clientKey: 'client_individual_sub_4_90_price',
    hallBase: 'individual_sub_4',
  },
  {
    title: 'Индив. абонемент 8 × 1.5ч',
    lessonKind: 'individual',
    format: 'subscription',
    durationMinutes: 90,
    sessionsCount: 8,
    clientKey: 'client_individual_sub_8_90_price',
    hallBase: 'individual_sub_8',
  },
]

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /* ── 1. Таблицы ── */

    await queryInterface.createTable('locations', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING, allowNull: false },
      address: { type: Sequelize.STRING, allowNull: true },
      kind: { type: Sequelize.STRING, allowNull: false, defaultValue: 'hall' },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.createTable('pricing_rules', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      location_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'locations', key: 'id' },
        onDelete: 'CASCADE',
      },
      title: { type: Sequelize.STRING, allowNull: false },
      lesson_kind: { type: Sequelize.STRING, allowNull: false },
      format: { type: Sequelize.STRING, allowNull: false },
      duration_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 60 },
      sessions_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      client_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      client_prime_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      hall_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      hall_prime_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    /* ── 2. Колонки location_id ── */

    for (const table of ['trainings', 'hall_costs', 'payments', 'groups']) {
      await queryInterface.addColumn(table, 'location_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'locations', key: 'id' },
        onDelete: 'SET NULL',
      })
    }

    /* ── 3. Data-миграция ── */

    const sequelize = queryInterface.sequelize
    const now = new Date()

    const [users] = await sequelize.query('SELECT id FROM users')

    for (const user of users) {
      const userId = user.id
      const locationId = randomUUID()

      // Локация «Основной зал» для каждого тренера.
      await queryInterface.bulkInsert('locations', [
        {
          id: locationId,
          user_id: userId,
          name: 'Основной зал',
          address: null,
          kind: 'hall',
          is_default: true,
          archived: false,
          created_at: now,
          updated_at: now,
        },
      ])

      // Привязка существующих записей к дефолтной локации.
      // Имена таблиц в бэктиках — `groups` зарезервировано в MySQL.
      for (const table of ['trainings', 'hall_costs', 'payments', 'groups']) {
        await sequelize.query(
          `UPDATE \`${table}\` SET location_id = :locationId WHERE user_id = :userId`,
          { replacements: { locationId, userId } },
        )
      }

      // Раскладка старого JSON-словаря цен в pricing_rules.
      const [pricingRows] = await sequelize.query(
        'SELECT data FROM pricing WHERE user_id = :userId LIMIT 1',
        { replacements: { userId } },
      )
      if (!pricingRows.length) continue

      let data = pricingRows[0].data
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch {
          data = {}
        }
      }
      data = data || {}

      const rules = RULE_MAP.map((r) => ({
        id: randomUUID(),
        user_id: userId,
        location_id: locationId,
        title: r.title,
        lesson_kind: r.lessonKind,
        format: r.format,
        duration_minutes: r.durationMinutes,
        sessions_count: r.sessionsCount,
        client_price: num(data[r.clientKey]),
        // prime-цены клиента в старой модели отсутствовали — берём обычную.
        client_prime_price: num(data[r.clientKey]),
        hall_cost: num(data[`hall_${r.hallBase}_regular_price`]),
        hall_prime_cost: num(data[`hall_${r.hallBase}_prime_price`]),
        active: true,
        created_at: now,
        updated_at: now,
      }))

      await queryInterface.bulkInsert('pricing_rules', rules)
    }
  },

  async down(queryInterface) {
    for (const table of ['groups', 'payments', 'hall_costs', 'trainings']) {
      await queryInterface.removeColumn(table, 'location_id')
    }
    await queryInterface.dropTable('pricing_rules')
    await queryInterface.dropTable('locations')
  },
}

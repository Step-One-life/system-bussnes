'use strict'

/** Индекс под самые частые выборки тренировок: по тренеру и дате. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('trainings', ['user_id', 'date'], {
      name: 'ix_trainings_user_date',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('trainings', 'ix_trainings_user_date')
  },
}

'use strict'

/**
 * UNIQUE(training_id, student_id) на visits — железная защита от двойной
 * отметки: проигравшая параллельная транзакция падает на вставке визита и
 * откатывается вместе со списанием/платежом. NULL training_id (легаси-визиты
 * без тренировки) под ограничение не попадают (MySQL допускает дубли NULL).
 */
module.exports = {
  async up(queryInterface) {
    // На случай исторических дублей: оставляем самый ранний визит пары.
    await queryInterface.sequelize.query(`
      DELETE v1 FROM visits v1
      JOIN visits v2
        ON v1.training_id = v2.training_id
       AND v1.student_id = v2.student_id
       AND v1.id > v2.id
      WHERE v1.training_id IS NOT NULL
    `)
    await queryInterface.addIndex('visits', ['training_id', 'student_id'], {
      unique: true,
      name: 'uq_visits_training_student',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('visits', 'uq_visits_training_student')
  },
}

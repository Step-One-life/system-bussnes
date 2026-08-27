'use strict'

/**
 * trainings.planned_student_id / planned_student_id_2 → students.id
 * с ON DELETE SET NULL.
 *
 * Колонки были объявлены без внешнего ключа, и удаление ученика оставляло
 * висячие ссылки: занятия продолжали висеть в расписании и календаре с
 * подписью «?». Доменная зачистка (StudentService.removeForUser) снимает такие
 * занятия целиком, а этот FK — страховка для исторических данных и для путей
 * удаления в обход сервиса.
 */
module.exports = {
  async up(queryInterface) {
    // Осиротевшие ссылки обнуляем до навешивания ключа, иначе FK не создастся.
    await queryInterface.sequelize.query(`
      UPDATE trainings t
      LEFT JOIN students s ON s.id = t.planned_student_id
      SET t.planned_student_id = NULL
      WHERE t.planned_student_id IS NOT NULL AND s.id IS NULL
    `)
    await queryInterface.sequelize.query(`
      UPDATE trainings t
      LEFT JOIN students s ON s.id = t.planned_student_id_2
      SET t.planned_student_id_2 = NULL
      WHERE t.planned_student_id_2 IS NOT NULL AND s.id IS NULL
    `)

    await queryInterface.addConstraint('trainings', {
      fields: ['planned_student_id'],
      type: 'foreign key',
      name: 'fk_trainings_planned_student',
      references: { table: 'students', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    })
    await queryInterface.addConstraint('trainings', {
      fields: ['planned_student_id_2'],
      type: 'foreign key',
      name: 'fk_trainings_planned_student_2',
      references: { table: 'students', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('trainings', 'fk_trainings_planned_student_2')
    await queryInterface.removeConstraint('trainings', 'fk_trainings_planned_student')
  },
}

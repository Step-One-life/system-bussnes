'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trainings', 'is_pair', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })
    await queryInterface.addColumn('trainings', 'planned_student_id_2', {
      type: Sequelize.UUID,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('trainings', 'planned_student_id_2')
    await queryInterface.removeColumn('trainings', 'is_pair')
  },
}

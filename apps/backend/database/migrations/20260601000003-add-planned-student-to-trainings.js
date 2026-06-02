'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trainings', 'planned_student_id', {
      type: Sequelize.UUID,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('trainings', 'planned_student_id')
  },
}

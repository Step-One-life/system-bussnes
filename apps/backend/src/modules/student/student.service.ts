import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { FindOptions } from 'sequelize'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { assertOwned } from '../../common/services/assert-owned'
import { Group } from '../group/group.model'
import { TrainingService } from '../training/training.service'
import { CreateStudentDto } from './dto/create-student.dto'
import { UpdateStudentDto } from './dto/update-student.dto'
import { Student } from './student.model'
import { Subscription } from './subscription.model'
import { Visit } from './visit.model'

@Injectable()
export class StudentService extends OwnedCrudService<Student> {
  constructor(
    @InjectModel(Student) private readonly studentModel: typeof Student,
    @InjectModel(Group) private readonly groupModel: typeof Group,
    @Inject(forwardRef(() => TrainingService))
    private readonly trainingService: TrainingService,
  ) {
    super(studentModel)
  }

  /**
   * Три hasMany в одном запросе давали декартово произведение строк: 11
   * учеников с 42 визитами превращались в 138 строк SQL, а на реальной базе
   * за пару лет — в мегабайты на КАЖДЫЙ GET /students (самый горячий
   * эндпоинт: инвалидируется после каждой отметки). separate:true выполняет
   * их отдельными запросами — перемножения больше нет.
   */
  protected get include(): FindOptions['include'] {
    return [
      Group,
      { model: Subscription, separate: true },
      { model: Visit, separate: true },
    ]
  }

  async createStudent(userId: string, dto: CreateStudentDto): Promise<Student> {
    // Группы должны принадлежать тренеру — иначе можно привязать ученика к чужой
    // группе по перебранному UUID (mass-assignment чужого FK).
    await assertOwned(this.groupModel, userId, dto.groups ?? [], 'Группа не найдена')
    const student = await this.createForUser(userId, {
      name: dto.name,
      phone: dto.phone ?? null,
      note: dto.note ?? null,
    })
    if (dto.groups?.length) {
      await student.$set('groups', dto.groups)
    }
    return this.findOneForUser(userId, student.id)
  }

  /**
   * Удаление ученика. Его плановые индивидуальные и парные занятия снимаются
   * доменно: колонки planned_student_id/-_2 были без FK и никем не обнулялись,
   * поэтому занятия оставались в расписании с подписью «?» (убирались только
   * по одному вручную), а события — в Google-календаре.
   */
  async removeForUser(userId: string, id: string): Promise<void> {
    await this.trainingService.removePlannedTrainingsOfStudent(userId, id)
    await super.removeForUser(userId, id)
  }

  async updateStudent(userId: string, id: string, dto: UpdateStudentDto): Promise<Student> {
    const student = await this.findOneForUser(userId, id)
    if (dto.groups !== undefined) {
      await assertOwned(this.groupModel, userId, dto.groups, 'Группа не найдена')
    }
    const fields: Partial<Pick<Student, 'name' | 'phone' | 'note'>> = {}
    if (dto.name !== undefined) fields.name = dto.name
    if (dto.phone !== undefined) fields.phone = dto.phone
    if (dto.note !== undefined) fields.note = dto.note
    if (Object.keys(fields).length) {
      await student.update(fields)
    }
    if (dto.groups !== undefined) {
      await student.$set('groups', dto.groups)
    }
    return this.findOneForUser(userId, id)
  }
}

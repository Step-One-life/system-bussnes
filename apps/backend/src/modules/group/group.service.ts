import { ConflictException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { UniqueConstraintError } from 'sequelize'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { Student } from '../student/student.model'
import { Subscription } from '../student/subscription.model'
import { Group } from './group.model'
import type { CreateGroupDto } from './dto/create-group.dto'

@Injectable()
export class GroupService extends OwnedCrudService<Group> {
  constructor(
    @InjectModel(Group) private readonly groupModel: typeof Group,
    @InjectModel(Subscription) private readonly subModel: typeof Subscription,
    @InjectModel(Student) private readonly studentModel: typeof Student,
  ) {
    super(groupModel)
  }

  async createGroup(userId: string, dto: CreateGroupDto): Promise<Group> {
    const exists = await this.groupModel.findOne({ where: { userId, name: dto.name } })
    if (exists) {
      throw new ConflictException(`Группа «${dto.name}» уже существует`)
    }
    try {
      return await this.createForUser(userId, {
        name: dto.name,
        schedule: dto.schedule ?? [],
        duration: dto.duration ?? 60,
        isIndividual: dto.isIndividual ?? false,
        locationId: dto.locationId ?? null,
      })
    } catch (err) {
      // Гонка: параллельный запрос (напр. React StrictMode → двойной POST)
      // успел вставить группу между нашей проверкой и create. Уникальный
      // индекс (user_id, name) отбил дубль SequelizeUniqueConstraintError —
      // возвращаем уже созданную группу идемпотентно вместо непрозрачной 500.
      if (err instanceof UniqueConstraintError) {
        const created = await this.groupModel.findOne({ where: { userId, name: dto.name } })
        if (created) return created
      }
      throw err
    }
  }

  /**
   * Удаление группы. Каскад БД сносит её тренировки, визиты и «свои»
   * абонементы — но ОБЩИЙ абонемент (groupIds на несколько групп) не должен
   * гибнуть вместе с одной из них: перед удалением выносим группу из его
   * списка, а «якорную» groupId переключаем на первую оставшуюся.
   */
  async removeForUser(userId: string, id: string): Promise<void> {
    await this.detachSharedSubscriptions(userId, id)
    await super.removeForUser(userId, id)
  }

  private async detachSharedSubscriptions(userId: string, groupId: string): Promise<void> {
    const students = await this.studentModel.findAll({
      where: { userId },
      attributes: ['id'],
    })
    if (!students.length) return
    const subs = await this.subModel.findAll({
      where: { studentId: students.map((s) => s.id) },
    })
    for (const sub of subs) {
      const ids = sub.groupIds ?? []
      if (ids.length < 2 || !ids.includes(groupId)) continue
      const rest = ids.filter((g) => g !== groupId)
      sub.groupIds = rest
      if (sub.groupId === groupId) sub.groupId = rest[0]
      await sub.save()
    }
  }
}

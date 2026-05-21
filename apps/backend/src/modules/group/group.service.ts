import { ConflictException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { Group } from './group.model'
import type { CreateGroupDto } from './dto/create-group.dto'

@Injectable()
export class GroupService extends OwnedCrudService<Group> {
  constructor(@InjectModel(Group) private readonly groupModel: typeof Group) {
    super(groupModel)
  }

  async createGroup(userId: string, dto: CreateGroupDto): Promise<Group> {
    const exists = await this.groupModel.findOne({ where: { userId, name: dto.name } })
    if (exists) {
      throw new ConflictException(`Группа «${dto.name}» уже существует`)
    }
    return this.createForUser(userId, {
      name: dto.name,
      schedule: dto.schedule ?? [],
      duration: dto.duration ?? 60,
      isIndividual: dto.isIndividual ?? false,
      locationId: dto.locationId ?? null,
    })
  }
}

import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { Location } from './location.model'
import type { CreateLocationDto } from './dto/create-location.dto'
import type { UpdateLocationDto } from './dto/update-location.dto'

@Injectable()
export class LocationService extends OwnedCrudService<Location> {
  constructor(@InjectModel(Location) private readonly locationModel: typeof Location) {
    super(locationModel)
  }

  /** Только неархивные локации тренера. */
  findEveryForUser(userId: string): Promise<Location[]> {
    return this.locationModel.findAll({
      where: { userId },
      order: [
        ['isDefault', 'DESC'],
        ['createdAt', 'ASC'],
      ],
    })
  }

  async createLocation(userId: string, dto: CreateLocationDto): Promise<Location> {
    const isFirst = (await this.locationModel.count({ where: { userId } })) === 0
    const isDefault = dto.isDefault ?? isFirst

    if (isDefault) {
      await this.clearDefault(userId)
    }
    return this.createForUser(userId, {
      name: dto.name,
      address: dto.address ?? null,
      kind: dto.kind ?? 'hall',
      isDefault,
      archived: false,
    })
  }

  async updateLocation(userId: string, id: string, dto: UpdateLocationDto): Promise<Location> {
    if (dto.isDefault) {
      await this.clearDefault(userId)
    }
    return this.updateForUser(userId, id, dto)
  }

  /** Снимает флаг is_default со всех локаций тренера. */
  private async clearDefault(userId: string): Promise<void> {
    await this.locationModel.update({ isDefault: false }, { where: { userId } })
  }
}

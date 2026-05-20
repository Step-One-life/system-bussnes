import type { Model } from 'sequelize-typescript'

import { BaseCrudService } from './base-crud.service'
import { PaginatedResponseDto } from '../dto/paginated-response.dto'
import type { PaginationDto } from '../dto/pagination.dto'

/**
 * CRUD service scoped to a user. Every method takes `userId` and
 * automatically filters / stamps it — protects against cross-tenant access.
 * Concrete services extend it and add domain logic.
 */
export abstract class OwnedCrudService<TModel extends Model> extends BaseCrudService<TModel> {
  createForUser(userId: string, data: object): Promise<TModel> {
    return super.create({ ...data, userId })
  }

  findAllForUser(userId: string, query: PaginationDto): Promise<PaginatedResponseDto<TModel>> {
    return super.findAll(query, { userId })
  }

  findEveryForUser(userId: string): Promise<TModel[]> {
    return super.findEvery({ userId })
  }

  findOneForUser(userId: string, id: string): Promise<TModel> {
    return super.findOne(id, { userId })
  }

  updateForUser(userId: string, id: string, data: object): Promise<TModel> {
    return super.update(id, data, { userId })
  }

  removeForUser(userId: string, id: string): Promise<void> {
    return super.remove(id, { userId })
  }
}

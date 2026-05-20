import { NotFoundException } from '@nestjs/common'
import { Op } from 'sequelize'
import type { FindOptions, WhereOptions } from 'sequelize'
import type { Model } from 'sequelize-typescript'

import { PaginatedResponseDto } from '../dto/paginated-response.dto'
import type { PaginationDto } from '../dto/pagination.dto'

/**
 * Static surface of a sequelize-typescript model the generic CRUD relies on.
 * Concrete services pass the model class directly: `super(MyModel)`.
 */
interface CrudModel<TModel extends Model> {
  name: string
  create(data: object): Promise<TModel>
  findAndCountAll(options: FindOptions): Promise<{ rows: TModel[]; count: number }>
  findAll(options: FindOptions): Promise<TModel[]>
  findOne(options: FindOptions): Promise<TModel | null>
}

/** A sequelize-typescript model class — `typeof MyModel`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModelClass<TModel extends Model> = (new () => TModel) & Record<string, any>

/**
 * Generic CRUD service. Concrete services extend it and only add
 * domain-specific logic — create/findAll/findOne/update/remove are inherited.
 */
export abstract class BaseCrudService<TModel extends Model> {
  /** Fields allowed for sorting — override per service. */
  protected readonly sortableFields: string[] = ['createdAt']
  /** Field used by `search` query — override per service (null = no search). */
  protected readonly searchField: string | null = 'name'

  protected readonly model: CrudModel<TModel>

  protected constructor(modelClass: ModelClass<TModel>) {
    this.model = modelClass as unknown as CrudModel<TModel>
  }

  /** Extra `include` for eager-loading — override per service. */
  protected get include(): FindOptions['include'] {
    return undefined
  }

  async create(data: object): Promise<TModel> {
    return this.model.create(data)
  }

  async findAll(
    query: PaginationDto,
    extraWhere: WhereOptions = {},
  ): Promise<PaginatedResponseDto<TModel>> {
    const { page = 1, pageSize = 20, sortField, sortOrder = 'asc', search } = query

    const where: WhereOptions = { ...extraWhere }
    if (search && this.searchField) {
      ;(where as Record<string, unknown>)[this.searchField] = { [Op.like]: `%${search}%` }
    }

    const order: [string, string][] =
      sortField && this.sortableFields.includes(sortField)
        ? [[sortField, sortOrder.toUpperCase()]]
        : [['createdAt', 'DESC']]

    const { rows, count } = await this.model.findAndCountAll({
      where,
      order,
      include: this.include,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    })

    return new PaginatedResponseDto(rows, count)
  }

  /** All rows without pagination (used when frontend loads full lists). */
  async findEvery(extraWhere: WhereOptions = {}): Promise<TModel[]> {
    return this.model.findAll({
      where: extraWhere,
      include: this.include,
      order: [['createdAt', 'DESC']],
    })
  }

  async findOne(id: string, extraWhere: WhereOptions = {}): Promise<TModel> {
    const entity = await this.model.findOne({
      where: { id, ...extraWhere },
      include: this.include,
    })
    if (!entity) {
      throw new NotFoundException(`${this.model.name} с id ${id} не найден`)
    }
    return entity
  }

  async update(id: string, data: object, extraWhere: WhereOptions = {}): Promise<TModel> {
    const entity = await this.findOne(id, extraWhere)
    await entity.update(data)
    return entity
  }

  async remove(id: string, extraWhere: WhereOptions = {}): Promise<void> {
    const entity = await this.findOne(id, extraWhere)
    await entity.destroy()
  }
}

import { ConflictException } from '@nestjs/common'
import { UniqueConstraintError } from 'sequelize'

import { GroupService } from './group.service'
import type { CreateGroupDto } from './dto/create-group.dto'

/**
 * Проверяем поведение createGroup на конкурентную вставку: уникальный индекс
 * (user_id, name) отбивает дубль, а сервис обязан вернуть уже созданную группу
 * идемпотентно, а не пробросить SequelizeUniqueConstraintError наружу (→ 500).
 */
describe('GroupService.createGroup', () => {
  const userId = 'user-1'
  const dto: CreateGroupDto = { name: 'Индивидуальные', isIndividual: true }

  function makeService(model: { findOne: jest.Mock; create: jest.Mock }): GroupService {
    const groupModel = { name: 'Group', ...model }
    // subModel / studentModel / locationModel в этих кейсах не участвуют
    // (dto без locationId → assertOwned не обращается к модели) — заглушки.
    return new GroupService(
      groupModel as never,
      {} as never,
      {} as never,
      {} as never,
    )
  }

  it('создаёт группу, когда такой ещё нет (happy path)', async () => {
    const created = { id: 'g1', name: dto.name }
    const findOne = jest.fn().mockResolvedValue(null)
    const create = jest.fn().mockResolvedValue(created)
    const svc = makeService({ findOne, create })

    await expect(svc.createGroup(userId, dto)).resolves.toBe(created)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ userId, name: dto.name }))
  })

  it('бросает ConflictException на последовательном дубле (pre-check)', async () => {
    const findOne = jest.fn().mockResolvedValue({ id: 'g1', name: dto.name })
    const create = jest.fn()
    const svc = makeService({ findOne, create })

    await expect(svc.createGroup(userId, dto)).rejects.toBeInstanceOf(ConflictException)
    expect(create).not.toHaveBeenCalled()
  })

  it('возвращает существующую группу идемпотентно при гонке (UniqueConstraintError)', async () => {
    const racedGroup = { id: 'g-raced', name: dto.name }
    // 1-й findOne (pre-check) — null, 2-й findOne (re-fetch после гонки) — группа.
    const findOne = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(racedGroup)
    const create = jest.fn().mockRejectedValue(new UniqueConstraintError({}))
    const svc = makeService({ findOne, create })

    await expect(svc.createGroup(userId, dto)).resolves.toBe(racedGroup)
    expect(findOne).toHaveBeenCalledTimes(2)
  })

  it('пробрасывает UniqueConstraintError, если перечитать группу не удалось', async () => {
    const findOne = jest.fn().mockResolvedValue(null)
    const create = jest.fn().mockRejectedValue(new UniqueConstraintError({}))
    const svc = makeService({ findOne, create })

    await expect(svc.createGroup(userId, dto)).rejects.toBeInstanceOf(UniqueConstraintError)
  })
})

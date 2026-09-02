import 'reflect-metadata'

import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { CreateTrainingDto } from '../../modules/training/dto/create-training.dto'
import { isIsoDate } from './date-format.decorators'

const GROUP = '3f2a4c1e-9b7d-4e2a-8c1f-0a1b2c3d4e5f'

async function errorsFor(body: object): Promise<string[]> {
  const dto = plainToInstance(CreateTrainingDto, body)
  const errors = await validate(dto)
  return errors.map((e) => e.property)
}

describe('isIsoDate', () => {
  it('принимает реальную дату YYYY-MM-DD', () => {
    expect(isIsoDate('2026-09-20')).toBe(true)
    expect(isIsoDate('2024-02-29')).toBe(true)
  })

  it('отклоняет несуществующие даты и ISO с временем', () => {
    expect(isIsoDate('2026-13-45')).toBe(false)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-09-20T10:00:00Z')).toBe(false)
    expect(isIsoDate('20.09.2026')).toBe(false)
    expect(isIsoDate(20260920)).toBe(false)
  })
})

describe('CreateTrainingDto: дата и время', () => {
  it('валидное тело проходит', async () => {
    expect(await errorsFor({ groupId: GROUP, date: '2026-09-20', time: '10:30' })).toEqual([])
  })

  it('без времени — допустимо (time опционален)', async () => {
    expect(await errorsFor({ groupId: GROUP, date: '2026-09-20' })).toEqual([])
  })

  it("'2026-13-45' раньше уходил в MySQL и давал 500 — теперь 400 на валидации", async () => {
    expect(await errorsFor({ groupId: GROUP, date: '2026-13-45', time: '10:00' })).toContain('date')
  })

  it("'99:99' и 'abc' раньше сохранялись как время занятия", async () => {
    expect(await errorsFor({ groupId: GROUP, date: '2026-09-20', time: '99:99' })).toContain('time')
    expect(await errorsFor({ groupId: GROUP, date: '2026-09-20', time: 'abc' })).toContain('time')
    expect(await errorsFor({ groupId: GROUP, date: '2026-09-20', time: '9:00' })).toContain('time')
  })
})

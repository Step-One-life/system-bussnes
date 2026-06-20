import { NotFoundException } from '@nestjs/common'

/** Модель Sequelize, у которой можно посчитать строки (статический count). */
export interface CountableModel {
  count(options: { where: Record<string, unknown> }): Promise<number>
}

/**
 * Гарантирует, что КАЖДЫЙ из переданных id принадлежит текущему тренеру (userId).
 *
 * Закрывает mass-assignment чужого внешнего ключа: при создании сущности можно
 * было передать UUID объекта другого тренера (ученик/абонемент → чужая группа,
 * тариф/группа → чужая локация), и FK уходил в чужой домен. null/undefined и
 * повторы отсеиваются; пустой список — no-op. Если хоть один id не найден у
 * userId — бросает NotFoundException (как и остальные проверки владения в проекте).
 */
export async function assertOwned(
  model: CountableModel,
  userId: string,
  ids: ReadonlyArray<string | null | undefined>,
  message: string,
): Promise<void> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))]
  if (unique.length === 0) return
  const owned = await model.count({ where: { id: unique, userId } })
  if (owned !== unique.length) throw new NotFoundException(message)
}

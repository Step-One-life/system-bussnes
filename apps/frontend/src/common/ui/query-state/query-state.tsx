import { ErrorState } from '../error-state/error-state'
import { ListSkeleton } from '../list-skeleton/list-skeleton'

import type { ReactNode } from 'react'

interface QueryStateProps {
  /**
   * Данных ещё нет — передавать именно `isPending` react-query, НЕ `isLoading`.
   * `isLoading` в паузах между ретраями ложный, и тогда выигрывает ветка
   * «пусто»: отказ бэка снова выглядит как «данных нет».
   */
  isPending: boolean
  isError: boolean
  onRetry?: () => void
  /** Показать вместо содержимого, когда данных нет (не путать с ошибкой). */
  empty?: ReactNode
  isEmpty?: boolean
  skeletonRows?: number
  children: ReactNode
}

/**
 * Единая развилка «грузится / упало / пусто / данные».
 *
 * Экраны разводили её каждый по-своему и врали по-разному: «Ученики не найдены»
 * вместо ошибки сети, зелёное «Все абонементы в порядке» на недогруженной
 * главной, нулевой доход и красная маржа 0% в статистике. Порядок здесь один и
 * важен: ошибка старше пустоты, иначе сбой выглядит как «данных нет» и тренер
 * заводит существующие сущности заново.
 */
export function QueryState({
  isPending,
  isError,
  onRetry,
  empty,
  isEmpty = false,
  skeletonRows,
  children,
}: QueryStateProps) {
  if (isError) return <ErrorState onRetry={onRetry} />
  if (isPending) return <ListSkeleton rows={skeletonRows} />
  if (isEmpty && empty) return <>{empty}</>
  return <>{children}</>
}

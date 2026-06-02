import type { LocationKind } from '../enums'

/** Зал / студия / площадка, где тренер проводит занятия. */
export interface Location {
  id: string
  name: string
  address: string | null
  kind: LocationKind
  isDefault: boolean
  archived: boolean
  createdAt: string
  primeWeekdayStart: string | null
  primeWeekdayEnd: string | null
  primeWeekendStart: string | null
  primeWeekendEnd: string | null
}

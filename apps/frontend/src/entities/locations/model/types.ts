export type LocationKind = 'hall' | 'studio' | 'outdoor' | 'online'

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

export interface LocationInput {
  name: string
  address?: string | null
  kind?: LocationKind
  isDefault?: boolean
  primeWeekdayStart?: string | null
  primeWeekdayEnd?: string | null
  primeWeekendStart?: string | null
  primeWeekendEnd?: string | null
}

export interface LocationChanges {
  name?: string
  address?: string | null
  kind?: LocationKind
  isDefault?: boolean
  archived?: boolean
  primeWeekdayStart?: string | null
  primeWeekdayEnd?: string | null
  primeWeekendStart?: string | null
  primeWeekendEnd?: string | null
}

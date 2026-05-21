export type LocationKind = 'hall' | 'studio' | 'outdoor' | 'online'

export interface Location {
  id: string
  name: string
  address: string | null
  kind: LocationKind
  isDefault: boolean
  archived: boolean
  createdAt: string
}

export interface LocationInput {
  name: string
  address?: string | null
  kind?: LocationKind
  isDefault?: boolean
}

export interface LocationChanges {
  name?: string
  address?: string | null
  kind?: LocationKind
  isDefault?: boolean
  archived?: boolean
}

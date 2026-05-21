import type { LocationKind } from './types'

/** Location kinds with their i18n label keys. */
export const LOCATION_KINDS: { value: LocationKind; labelKey: string }[] = [
  { value: 'hall', labelKey: 'locations.kind.hall' },
  { value: 'studio', labelKey: 'locations.kind.studio' },
  { value: 'outdoor', labelKey: 'locations.kind.outdoor' },
  { value: 'online', labelKey: 'locations.kind.online' },
]

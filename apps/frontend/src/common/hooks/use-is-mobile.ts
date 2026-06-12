import { useSyncExternalStore } from 'react'

const mql = window.matchMedia('(max-width: 768px)')

function subscribe(onChange: () => void) {
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/** Мобильный брейкпоинт (≤768px), живой при ресайзе. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => mql.matches)
}

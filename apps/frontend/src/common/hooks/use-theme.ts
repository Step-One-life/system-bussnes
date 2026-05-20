import { useContext } from 'react'

import { ThemeContext } from 'app/providers/theme-provider'

export function useTheme() {
  return useContext(ThemeContext)
}

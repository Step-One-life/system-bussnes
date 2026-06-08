import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

import { App as AntdApp, ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'

import { getAntdTheme } from 'app/theme/antd-theme'

import type { ThemeMode } from 'app/theme/antd-theme'
import type { ReactNode } from 'react'

interface ThemeContextValue {
  mode: ThemeMode
  toggle: () => void
}

const STORAGE_KEY = 'tk_theme'

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  toggle: () => {},
})

function readInitialMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'light' ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readInitialMode)

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const toggle = useCallback(() => {
    setMode((m) => (m === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({ mode, toggle }), [mode, toggle])

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider locale={ruRU} theme={getAntdTheme(mode)}>
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}

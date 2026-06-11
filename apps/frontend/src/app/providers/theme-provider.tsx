import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

import { App as AntdApp, ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'

import { getAntdTheme } from 'app/theme/antd-theme'

import type { ThemeMode } from 'app/theme/antd-theme'
import type { ReactNode } from 'react'

/** Выбор пользователя; system разрешается через prefers-color-scheme. */
export type ThemePreference = ThemeMode | 'system'

interface ThemeContextValue {
  /** Разрешённая тема — то, что реально применено (light/dark). */
  mode: ThemeMode
  preference: ThemePreference
  setPreference: (pref: ThemePreference) => void
}

const STORAGE_KEY = 'tk_theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  preference: 'system',
  setPreference: () => {},
})

function readInitialPreference(): ThemePreference {
  const saved = localStorage.getItem(STORAGE_KEY)
  // Легаси-значения light/dark остаются ручным выбором; без записи — системная.
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

function systemMode(): ThemeMode {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readInitialPreference)
  const [mode, setMode] = useState<ThemeMode>(() =>
    preference === 'system' ? systemMode() : preference,
  )

  // Системная тема может смениться на лету — следим, пока выбран режим system.
  useEffect(() => {
    if (preference !== 'system') {
      setMode(preference)
      return
    }
    setMode(systemMode())
    const mq = window.matchMedia(DARK_QUERY)
    const onChange = (e: MediaQueryListEvent) => setMode(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  useEffect(() => {
    document.documentElement.dataset.theme = mode
  }, [mode])

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref)
    localStorage.setItem(STORAGE_KEY, pref)
  }, [])

  const value = useMemo(
    () => ({ mode, preference, setPreference }),
    [mode, preference, setPreference],
  )

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider locale={ruRU} theme={getAntdTheme(mode)}>
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}

import { theme as antdTheme } from 'antd'

import type { ThemeConfig } from 'antd'

export type ThemeMode = 'dark' | 'light'

const sharedToken = {
  colorPrimary: '#01696f',
  colorSuccess: '#22c55e',
  colorWarning: '#f59e0b',
  colorError: '#ef4444',
  borderRadius: 10,
  fontFamily: "'Satoshi', system-ui, sans-serif",
}

const darkColors = {
  colorBgBase: '#0d0f10',
  colorBgContainer: '#1a1e24',
  colorBgElevated: '#13161a',
  colorTextBase: '#f0f2f5',
  colorBorder: 'rgba(255,255,255,0.07)',
}

const lightColors = {
  colorBgBase: '#f4f5f7',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorTextBase: '#111316',
  colorBorder: 'rgba(0,0,0,0.08)',
}

// Button sizing aligned with legacy .btn / .btn--sm / .btn--lg.
const buttonComponent = {
  // .btn — padding 10px 20px, font 0.875rem, radius --r-md
  controlHeight: 40,
  paddingInline: 20,
  fontSize: 14,
  borderRadius: 10,
  fontWeight: 600,
  // .btn--sm — padding 4px 12px, font 0.8rem, radius --r-sm
  controlHeightSM: 28,
  paddingInlineSM: 12,
  // .btn--lg — padding 12px 24px, font 0.95rem
  controlHeightLG: 46,
  paddingInlineLG: 24,
}

export function getAntdTheme(mode: ThemeMode): ThemeConfig {
  return {
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      ...sharedToken,
      ...(mode === 'dark' ? darkColors : lightColors),
    },
    components: {
      Button: buttonComponent,
    },
  }
}

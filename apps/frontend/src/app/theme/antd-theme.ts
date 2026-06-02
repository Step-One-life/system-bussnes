import { theme as antdTheme } from 'antd'

import type { ThemeConfig } from 'antd'

export type ThemeMode = 'dark' | 'light'

const sharedToken = {
  colorPrimary: '#5856D6',
  colorSuccess: '#34C759',
  colorWarning: '#FF9500',
  colorError: '#FF3B30',
  borderRadius: 12,
  fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
}

const darkColors = {
  colorBgBase: '#000000',
  colorBgContainer: '#1C1C1E',
  colorBgElevated: '#2C2C2E',
  colorTextBase: '#FFFFFF',
  colorBorder: 'rgba(255,255,255,0.08)',
}

const lightColors = {
  colorBgBase: '#F2F2F7',
  colorBgContainer: '#FFFFFF',
  colorBgElevated: '#FFFFFF',
  colorTextBase: '#000000',
  colorBorder: 'rgba(60,60,67,0.13)',
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

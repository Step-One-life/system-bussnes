import { theme as antdTheme } from 'antd'

import type { ThemeConfig } from 'antd'

export type ThemeMode = 'dark' | 'light'

/* TS-зеркало палитры design-tokens.scss: antd ConfigProvider не умеет
   CSS-переменные в этих токенах (выводит из них производные цвета).
   Меняя цвет в design-tokens.scss — обновить и здесь. */
const tkColors = {
  dark: {
    accent: '#8b7ef0', // --tk-accent
    success: '#97c7a3', // --tk-success-dot
    warning: '#d9b36a', // --tk-warning-dot
    danger: '#d97f6a', // --tk-danger-dot
    bgBase: '#0a0a0c', // --tk-surface-page
    bgContainer: '#111114', // --tk-surface-card
    bgElevated: '#1a1a1f', // --tk-surface-raised
    textBase: '#f2f2f5', // --tk-text-primary
    border: '#1c1c21', // --tk-border-default
    segTrack: '#17171b', // --tk-surface-hover
    segItem: '#8a8a92', // --tk-text-secondary
    accentSubtleBg: 'rgba(139, 126, 240, 0.1)', // --tk-accent-subtle-bg
    accentText: '#a89ef5', // --tk-accent-text
  },
  light: {
    accent: '#6c5cf0',
    success: '#4a8a56',
    warning: '#c79a3d',
    danger: '#c25b3f',
    bgBase: '#faf9f6',
    bgContainer: '#ffffff',
    bgElevated: '#ffffff',
    textBase: '#211f1a',
    border: '#e7e3d9',
    segTrack: '#f4f2ec',
    segItem: '#6e6a60',
    accentSubtleBg: 'rgba(108, 92, 240, 0.08)', // --tk-accent-subtle-bg
    accentText: '#5b4ce0', // --tk-accent-text
  },
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
  const c = tkColors[mode]
  return {
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: c.accent,
      colorSuccess: c.success,
      colorWarning: c.warning,
      colorError: c.danger,
      borderRadius: 12,
      fontFamily:
        "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
      colorBgBase: c.bgBase,
      colorBgContainer: c.bgContainer,
      colorBgElevated: c.bgElevated,
      colorTextBase: c.textBase,
      colorBorder: c.border,
    },
    components: {
      Button: buttonComponent,
      // Единый вид переключателей: трек на --tk-surface-hover, активный
      // сегмент — subtle-подложка с accent-текстом (сплошной accent
      // зарезервирован за мелкими индикаторами); обводка выбранного
      // сегмента — в design-tokens.scss (antd-токена под неё нет).
      Segmented: {
        trackBg: c.segTrack,
        itemColor: c.segItem,
        itemSelectedBg: c.accentSubtleBg,
        itemSelectedColor: c.accentText,
        controlHeight: 44,
      },
    },
  }
}

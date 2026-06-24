import { Component } from 'react'

import i18n from 'i18next'

import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Ловит ошибки рендера в дереве и показывает понятный экран вместо «белой
 * страницы». Стили заданы напрямую (с фолбэками токенов) — на случай, если
 * сломана тема. Текст через i18n.t с defaultValue: при неинициализированном
 * i18n (краш до старта) показывается русский фолбэк, иначе — язык пользователя.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Необработанная ошибка интерфейса:', error, info)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          // Фолбэки обязательны: при краше до установки data-theme токены
          // не определены, экран должен остаться читаемым.
          background: 'var(--tk-surface-page, #16181d)',
          color: 'var(--tk-text-primary, #e6e6e6)',
        }}
      >
        <div style={{ fontSize: '40px' }}>⚠️</div>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>
          {i18n.t('errors.boundary.title', { defaultValue: 'Что-то пошло не так' })}
        </h1>
        <p style={{ color: 'var(--tk-text-secondary, #9aa0a6)', maxWidth: 360, margin: 0 }}>
          {i18n.t('errors.boundary.description', {
            defaultValue:
              'Произошла ошибка в интерфейсе. Попробуйте перезагрузить страницу — данные не потеряны.',
          })}
        </p>
        <button
          onClick={this.handleReload}
          style={{
            marginTop: '8px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--tk-accent, #6366f1)',
            color: 'var(--tk-accent-contrast, #fff)',
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          {i18n.t('errors.boundary.reload', { defaultValue: 'Перезагрузить' })}
        </button>
      </div>
    )
  }
}

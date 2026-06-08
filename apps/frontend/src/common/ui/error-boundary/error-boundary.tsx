import { Component } from 'react'

import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Ловит ошибки рендера в дереве и показывает понятный экран вместо «белой
 * страницы». Текст и стили заданы напрямую (не через i18next/тему) — на случай,
 * если сломан сам провайдер локализации или темы.
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
          background: '#16181d',
          color: '#e6e6e6',
        }}
      >
        <div style={{ fontSize: '40px' }}>⚠️</div>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Что-то пошло не так</h1>
        <p style={{ color: '#9aa0a6', maxWidth: 360, margin: 0 }}>
          Произошла ошибка в интерфейсе. Попробуйте перезагрузить страницу — данные не
          потеряны.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            marginTop: '8px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#6366f1',
            color: '#fff',
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          Перезагрузить
        </button>
      </div>
    )
  }
}

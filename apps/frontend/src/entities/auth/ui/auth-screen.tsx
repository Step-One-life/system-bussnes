import type { ReactNode } from 'react'

interface AuthScreenProps {
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export function AuthScreen({ subtitle, children, footer }: AuthScreenProps) {
  return (
    <div className="auth-screen">
      <div className="auth-screen__card">
        <div className="auth-screen__logo">
          <span className="auth-screen__logo-icon">⟡</span>
          <span>TriKick</span>
        </div>
        <div className="auth-screen__subtitle">{subtitle}</div>
        {children}
        <div className="auth-screen__footer">{footer}</div>
      </div>
    </div>
  )
}

import { Fragment } from 'react'

import { Button } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate } from 'react-router-dom'

import { useTheme } from 'common/hooks/use-theme'
import { useAuth } from 'entities/auth/api/use-auth'
import { getInitials } from 'entities/students'

import { NAV_ITEMS } from './nav-config'

export function Sidebar() {
  const { t } = useTranslation()
  const { mode, toggle } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <span className="sidebar__logo-icon">⟡</span>
        <span className="sidebar__logo-text">{t('app.name')}</span>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <Fragment key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-item__icon">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
            {item.dividerAfter && <div className="sidebar__divider" />}
          </Fragment>
        ))}
      </nav>

      <div className="sidebar__footer">
        {user && (
          <div className="sidebar__user">
            <div className="sidebar__user-avatar">{getInitials(user.name)}</div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user.name}</span>
              <span className="sidebar__user-email">{user.email}</span>
            </div>
          </div>
        )}
        <div className="sidebar__actions">
          <button className="theme-toggle" onClick={toggle} title={t('common.themeToggle')}>
            {mode === 'dark' ? '☀' : '☾'}
          </button>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            title={t('common.logout')}
          />
        </div>
      </div>
    </aside>
  )
}

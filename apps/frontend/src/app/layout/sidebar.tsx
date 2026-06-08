import { Fragment } from 'react'

import { DownOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { useAuth } from 'entities/auth/api/use-auth'
import { getInitials } from 'entities/students'

import { NAV_ITEMS } from './nav-config'
import { ProfileMenu } from './profile-menu'

export function Sidebar() {
  const { t } = useTranslation()
  const { user } = useAuth()

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
          <ProfileMenu placement="topRight">
            <div className="sidebar__user sidebar__user--clickable">
              <div className="sidebar__user-avatar">{getInitials(user.name)}</div>
              <div className="sidebar__user-info">
                <span className="sidebar__user-name">{user.name}</span>
                <span className="sidebar__user-email">{user.email}</span>
              </div>
              <DownOutlined className="sidebar__user-caret" />
            </div>
          </ProfileMenu>
        )}
      </div>
    </aside>
  )
}

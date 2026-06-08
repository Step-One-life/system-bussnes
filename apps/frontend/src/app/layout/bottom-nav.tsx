import { UserOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { NAV_ITEMS } from './nav-config'
import { ProfileMenu } from './profile-menu'

export function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-item__icon">{item.icon}</span>
          <span>{t(item.shortLabelKey ?? item.labelKey)}</span>
        </NavLink>
      ))}
      <ProfileMenu placement="topRight">
        <button type="button" className="nav-item nav-item--profile">
          <span className="nav-item__icon">
            <UserOutlined />
          </span>
          <span>{t('common.profile')}</span>
        </button>
      </ProfileMenu>
    </nav>
  )
}

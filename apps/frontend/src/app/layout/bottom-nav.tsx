import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { NAV_ITEMS } from './nav-config'

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
    </nav>
  )
}

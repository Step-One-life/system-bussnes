import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'

import './people-layout.scss'

const TABS = [
  { to: 'students', labelKey: 'nav.students' },
  { to: 'groups', labelKey: 'nav.groups' },
  { to: 'individual', labelKey: 'nav.individual' },
] as const

export function PeopleLayout() {
  const { t } = useTranslation()

  return (
    <div>
      <nav className="people-tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `people-tabs__tab${isActive ? ' active' : ''}`}
          >
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}

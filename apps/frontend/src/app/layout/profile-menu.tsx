import { Dropdown } from 'antd'
import { BulbOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useTheme } from 'common/hooks/use-theme'
import { useAuth } from 'entities/auth/api/use-auth'

import type { MenuProps } from 'antd'
import type { ReactNode } from 'react'

interface ProfileMenuProps {
  /** Trigger element rendered inside the dropdown. */
  children: ReactNode
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
}

/**
 * Profile dropdown shared by the sidebar (desktop) and the bottom nav (mobile).
 * Hosts the calendar settings entry, theme toggle and logout, so these actions
 * live under the profile menu instead of the main navigation.
 */
export function ProfileMenu({ children, placement = 'topLeft' }: ProfileMenuProps) {
  const { t } = useTranslation()
  const { preference, setPreference } = useTheme()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const themeOption = (pref: 'light' | 'dark' | 'system', label: string) => ({
    key: `theme-${pref}`,
    label: preference === pref ? `✓ ${label}` : label,
    onClick: () => setPreference(pref),
  })

  const items: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('common.calendarSettings'),
      onClick: () => navigate('/settings'),
    },
    {
      key: 'theme',
      icon: <BulbOutlined />,
      label: t('common.theme'),
      children: [
        themeOption('light', t('common.themeOptionLight')),
        themeOption('dark', t('common.themeOptionDark')),
        themeOption('system', t('common.themeOptionSystem')),
      ],
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('common.logout'),
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <Dropdown menu={{ items }} placement={placement} trigger={['click']}>
      {children}
    </Dropdown>
  )
}

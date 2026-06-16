import { Dropdown } from 'antd'
import { BulbOutlined, HistoryOutlined, LogoutOutlined, RocketOutlined, SettingOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useTheme } from 'common/hooks/use-theme'
import { useAuth } from 'entities/auth/api/use-auth'
import { useOnboarding } from 'entities/onboarding'

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

  const onboarding = useOnboarding()

  const handleReopenOnboarding = () => {
    onboarding.reopen()
    navigate('/')
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const themeOption = (pref: 'light' | 'dark' | 'system', label: string) => ({
    key: `theme-${pref}`,
    label: preference === pref ? `✓ ${label}` : label,
    onClick: () => setPreference(pref),
  })

  const onboardingItem: MenuProps['items'] = onboarding.hasIncomplete
    ? [
        {
          key: 'onboarding',
          icon: <RocketOutlined />,
          label: t('nav.onboarding'),
          onClick: handleReopenOnboarding,
        },
      ]
    : []

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
    ...onboardingItem,
    {
      key: 'journal',
      icon: <HistoryOutlined />,
      label: t('nav.journal'),
      onClick: () => navigate('/journal'),
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

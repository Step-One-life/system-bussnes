import {
  AppstoreOutlined,
  CalendarOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons'

import type { ReactNode } from 'react'

export interface NavItem {
  path: string
  labelKey: string
  /** Shorter label for the mobile bottom nav (falls back to labelKey). */
  shortLabelKey?: string
  icon: ReactNode
  /** Render a visual divider after this item (sidebar only). */
  dividerAfter?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', labelKey: 'nav.home', icon: <AppstoreOutlined /> },
  { path: '/trainings', labelKey: 'nav.trainings', icon: <CalendarOutlined />, dividerAfter: true },
  { path: '/people', labelKey: 'nav.people', icon: <TeamOutlined />, dividerAfter: true },
  { path: '/finance', labelKey: 'nav.finance', icon: <WalletOutlined /> },
]

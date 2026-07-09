import { Outlet } from 'react-router-dom'

import { BottomNav } from './bottom-nav'
import { Sidebar } from './sidebar'
import { usePageTitle } from './use-page-title'

import './layout.scss'

export function AppLayout() {
  usePageTitle()
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

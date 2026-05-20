import { Outlet } from 'react-router-dom'

import { BottomNav } from './bottom-nav'
import { Sidebar } from './sidebar'

import './layout.scss'

export function AppLayout() {
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

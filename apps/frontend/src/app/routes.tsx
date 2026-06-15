/* eslint-disable react-refresh/only-export-components --
   файл экспортирует router (не компонент), создаваемый на уровне модуля:
   fast refresh к нему неприменим, правка роутов — всегда полная перезагрузка */
import { lazy, Suspense } from 'react'

import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppLayout } from './layout/app-layout'
import { ProtectedRoute } from './protected-route'

import type { ReactNode } from 'react'

// Страницы грузятся по требованию (route-based code splitting): код каждой
// страницы попадает в отдельный чанк и не утяжеляет начальную загрузку.
const LoginPage = lazy(() => import('pages/login').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import('pages/register').then((m) => ({ default: m.RegisterPage })),
)
const HomePage = lazy(() => import('pages/home').then((m) => ({ default: m.HomePage })))
const TrainingsPage = lazy(() =>
  import('pages/trainings').then((m) => ({ default: m.TrainingsPage })),
)
const PeopleLayout = lazy(() =>
  import('pages/people').then((m) => ({ default: m.PeopleLayout })),
)
const StudentsPage = lazy(() =>
  import('pages/students').then((m) => ({ default: m.StudentsPage })),
)
const GroupsPage = lazy(() => import('pages/groups').then((m) => ({ default: m.GroupsPage })))
const IndividualPage = lazy(() =>
  import('pages/individual').then((m) => ({ default: m.IndividualPage })),
)
const FinancePage = lazy(() =>
  import('pages/finance').then((m) => ({ default: m.FinancePage })),
)
const SettingsPage = lazy(() =>
  import('pages/settings').then((m) => ({ default: m.SettingsPage })),
)
const JournalPage = lazy(() =>
  import('pages/journal').then((m) => ({ default: m.JournalPage })),
)

function fallback(): ReactNode {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--tk-text-secondary, #8a8a92)',
      }}
    >
      Загрузка…
    </div>
  )
}

function lazyEl(node: ReactNode): ReactNode {
  return <Suspense fallback={fallback()}>{node}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/login', element: lazyEl(<LoginPage />) },
  { path: '/register', element: lazyEl(<RegisterPage />) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: lazyEl(<HomePage />) },
          { path: 'trainings', element: lazyEl(<TrainingsPage />) },
          {
            path: 'people',
            element: lazyEl(<PeopleLayout />),
            children: [
              { index: true, element: <Navigate to="students" replace /> },
              { path: 'students', element: lazyEl(<StudentsPage />) },
              { path: 'groups', element: lazyEl(<GroupsPage />) },
              { path: 'individual', element: lazyEl(<IndividualPage />) },
            ],
          },
          { path: 'finance', element: lazyEl(<FinancePage />) },
          { path: 'settings', element: lazyEl(<SettingsPage />) },
          { path: 'journal', element: lazyEl(<JournalPage />) },
        ],
      },
    ],
  },
])

import { createBrowserRouter, Navigate } from 'react-router-dom'

import { FinancePage } from 'pages/finance'
import { GroupsPage } from 'pages/groups'
import { HomePage } from 'pages/home'
import { IndividualPage } from 'pages/individual'
import { LoginPage } from 'pages/login'
import { PeopleLayout } from 'pages/people'
import { RegisterPage } from 'pages/register'
import { SettingsPage } from 'pages/settings'
import { StudentsPage } from 'pages/students'
import { TrainingsPage } from 'pages/trainings'

import { AppLayout } from './layout/app-layout'
import { ProtectedRoute } from './protected-route'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'trainings', element: <TrainingsPage /> },
          {
            path: 'people',
            element: <PeopleLayout />,
            children: [
              { index: true, element: <Navigate to="students" replace /> },
              { path: 'students', element: <StudentsPage /> },
              { path: 'groups', element: <GroupsPage /> },
              { path: 'individual', element: <IndividualPage /> },
            ],
          },
          { path: 'finance', element: <FinancePage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])

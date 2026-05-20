import { createBrowserRouter } from 'react-router-dom'

import { FinancePage } from 'pages/finance'
import { GroupsPage } from 'pages/groups'
import { HomePage } from 'pages/home'
import { IndividualPage } from 'pages/individual'
import { LoginPage } from 'pages/login'
import { RegisterPage } from 'pages/register'
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
          { path: 'students', element: <StudentsPage /> },
          { path: 'individual', element: <IndividualPage /> },
          { path: 'groups', element: <GroupsPage /> },
          { path: 'finance', element: <FinancePage /> },
        ],
      },
    ],
  },
])

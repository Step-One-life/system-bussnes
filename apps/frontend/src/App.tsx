import { RouterProvider } from 'react-router-dom'

import { AuthProvider } from 'app/providers/auth-provider'
import { QueryProvider } from 'app/providers/query-provider'
import { ThemeProvider } from 'app/providers/theme-provider'
import { router } from 'app/routes'

function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}

export default App

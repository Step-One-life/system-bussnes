import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { ReactNode } from 'react'

export const queryClient = new QueryClient({
  // Сбои загрузки данных логируем централизованно — не «глотаем» молча.
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('Ошибка загрузки данных:', error)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

import { QueryCache, QueryClient } from '@tanstack/react-query'

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

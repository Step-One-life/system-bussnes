import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  // Сбои загрузки данных логируем централизованно — не «глотаем» молча.
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('Ошибка загрузки данных:', error)
    },
  }),
  // Сбои мутаций тоже не теряем: глобальная сеть логирования (тосты ошибок
  // показывают сами вызовы там, где есть useToast — журнал, удаление записи).
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error('Ошибка изменения данных:', error)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

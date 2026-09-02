import i18n from 'i18next'

import { clearToken, getToken } from './token-storage'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
  error?: string
}

/** Error thrown for non-2xx responses, carrying the backend message. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  const url = BASE_URL + path
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * Тело ответа не обязано быть JSON: 502/504 от nginx приходят HTML-страницей,
 * и голый JSON.parse ронял запрос с «Unexpected token '<'» вместо понятной
 * ошибки со статусом. Непарсибельное тело считаем пустым.
 */
function parseJson(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function handleUnauthorized(): void {
  clearToken()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; query?: Record<string, string | undefined> } = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const init: RequestInit = { method, headers }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(options.body)
  }

  const res = await fetch(buildUrl(path, options.query), init)

  // 401 означает «сессия истекла» только для запросов ПОД токеном. Неверный
  // пароль на /auth/login — тоже 401, и раньше он превращался в «Сессия
  // истекла» вместо сообщения сервера «Неверный email или пароль».
  if (res.status === 401 && token) {
    handleUnauthorized()
    throw new ApiError(401, i18n.t('common.sessionExpired'))
  }

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  const payload = parseJson(text)

  if (!res.ok) {
    const body = (payload ?? {}) as ApiErrorBody
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : (body.message ?? body.error ?? i18n.t('common.requestError', { status: res.status }))
    throw new ApiError(res.status, message)
  }

  // Unwrap the standard { data, success } envelope.
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export const apiClient = {
  get: <T>(path: string, query?: Record<string, string | undefined>): Promise<T> =>
    request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>('PUT', path, { body }),
  delete: <T>(path: string): Promise<T> => request<T>('DELETE', path),
}

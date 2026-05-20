import { apiClient } from 'common/services/api/api-client'
import { clearToken, getToken, setToken } from 'common/services/api/token-storage'

import type { AuthUser, LoginInput, RegisterInput } from './types'

interface AuthResult {
  user: AuthUser
  token: string
}

export async function register(data: RegisterInput): Promise<AuthUser> {
  const result = await apiClient.post<AuthResult>('/auth/register', {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
  })
  setToken(result.token)
  return result.user
}

export async function login(data: LoginInput): Promise<AuthUser> {
  const result = await apiClient.post<AuthResult>('/auth/login', {
    email: data.email.trim().toLowerCase(),
    password: data.password,
  })
  setToken(result.token)
  return result.user
}

export function logout(): void {
  clearToken()
}

/** Resolve the current user from the stored token (null when not logged in). */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!getToken()) return null
  try {
    return await apiClient.get<AuthUser>('/auth/me')
  } catch {
    clearToken()
    return null
  }
}

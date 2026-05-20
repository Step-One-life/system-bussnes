import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  getCurrentUser,
  login as loginRepo,
  logout as logoutRepo,
  register as registerRepo,
} from 'entities/auth/model/auth.repo'
import { AuthContext } from 'entities/auth/model/auth-context'

import type { AuthContextValue } from 'entities/auth/model/auth-context'
import type { AuthUser, LoginInput, RegisterInput } from 'entities/auth/model/types'
import type { ReactNode } from 'react'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Resolve the current user from the stored token on mount.
  useEffect(() => {
    let cancelled = false
    getCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (data: LoginInput) => {
    setUser(await loginRepo(data))
  }, [])

  const register = useCallback(async (data: RegisterInput) => {
    setUser(await registerRepo(data))
  }, [])

  const logout = useCallback(() => {
    logoutRepo()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, login, register, logout }),
    [user, login, register, logout],
  )

  if (loading) return null

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

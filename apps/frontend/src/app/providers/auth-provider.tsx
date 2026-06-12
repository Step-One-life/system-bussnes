import { useCallback, useEffect, useMemo, useState } from 'react'

import { invalidateGroupMap } from 'common/services/api/group-map'
import {
  getCurrentUser,
  login as loginRepo,
  logout as logoutRepo,
  register as registerRepo,
} from 'entities/auth/model/auth.repo'
import { AuthContext } from 'entities/auth/model/auth-context'
import { invalidateLocations } from 'entities/locations'

import { queryClient } from './query-client'

import type { AuthContextValue } from 'entities/auth/model/auth-context'
import type { AuthUser, LoginInput, RegisterInput } from 'entities/auth/model/types'
import type { ReactNode } from 'react'

/**
 * Wipe all per-account data caches when the session changes. The app switches
 * accounts via client-side navigation (no full reload), so without this the
 * React Query cache and the module-level promise caches (locations, group map)
 * leak the previous user's data into a freshly logged-in account — e.g. a new
 * empty account showing the previous trainer's locations.
 */
function resetAppData() {
  queryClient.clear()
  invalidateLocations()
  invalidateGroupMap()
}

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
    resetAppData()
    setUser(await loginRepo(data))
  }, [])

  const register = useCallback(async (data: RegisterInput) => {
    resetAppData()
    setUser(await registerRepo(data))
  }, [])

  const logout = useCallback(() => {
    logoutRepo()
    resetAppData()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, login, register, logout }),
    [user, login, register, logout],
  )

  if (loading) return null

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

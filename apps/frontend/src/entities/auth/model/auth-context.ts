import { createContext } from 'react'

import type { AuthUser, LoginInput, RegisterInput } from './types'

export interface AuthContextValue {
  user: AuthUser | null
  login: (data: LoginInput) => Promise<void>
  register: (data: RegisterInput) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
})

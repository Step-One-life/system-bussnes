import { useContext } from 'react'

import { AuthContext } from '../model/auth-context'

export function useAuth() {
  return useContext(AuthContext)
}

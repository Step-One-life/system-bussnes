/** Standard envelope for a successful response. */
export interface ApiResponse<T> {
  data: T
  success: true
}

/** Standard envelope for a list response. */
export interface ApiListResponse<T> {
  items: T[]
  total: number
}

export interface ApiError {
  statusCode: number
  message: string
  error?: string
}

export interface AuthResult {
  user: import('../domain/auth').AuthUser
  token: string
}

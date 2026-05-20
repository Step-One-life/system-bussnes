/** JWT payload attached to the request after JwtAuthGuard. */
export interface CurrentUserPayload {
  id: string
  email: string
}

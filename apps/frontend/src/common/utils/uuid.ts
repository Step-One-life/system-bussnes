/** Generate a UUID, falling back to a pseudo-random id where unavailable. */
export function uuid(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

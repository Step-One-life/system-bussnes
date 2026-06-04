import { TokenCryptoService } from './token-crypto.service'

describe('TokenCryptoService', () => {
  const svc = new TokenCryptoService('some-secret-key')

  it('расшифровывает зашифрованное (round-trip)', () => {
    const enc = svc.encrypt('refresh-token-123')
    expect(enc).not.toContain('refresh-token-123')
    expect(svc.decrypt(enc)).toBe('refresh-token-123')
  })

  it('каждый раз даёт разный шифротекст (случайный IV)', () => {
    expect(svc.encrypt('x')).not.toBe(svc.encrypt('x'))
  })
})

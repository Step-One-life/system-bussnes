import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/** Шифрует/расшифровывает refresh-токены (AES-256-GCM). Ключ — из конфига. */
@Injectable()
export class TokenCryptoService {
  private readonly key: Buffer

  constructor(secret: string | ConfigService) {
    const raw =
      typeof secret === 'string' ? secret : secret.get<string>('calendarTokenEncKey') ?? ''
    // sha256 даёт стабильные 32 байта из ключа любой длины.
    this.key = createHash('sha256').update(raw).digest()
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.')
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, encB64] = payload.split('.')
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(encB64, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  }
}

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

function getKey() {
  const rawKey = process.env.ENCRYPTION_KEY

  if (!rawKey) {
    throw new Error('ENCRYPTION_KEY is required')
  }

  const isHexKey = /^[a-fA-F0-9]{64}$/.test(rawKey)
  // Non-hex values are hashed into a 32-byte key for convenience. Changing
  // formats during key rotation will produce a different derived key and break
  // decryption for existing ciphertext.
  return isHexKey ? Buffer.from(rawKey, 'hex') : createHash('sha256').update(rawKey).digest()
}

export function encrypt(text: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decrypt(text: string): string {
  const [ivHex, authTagHex, encryptedHex] = text.split(':')

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Encrypted payload is malformed')
  }

  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

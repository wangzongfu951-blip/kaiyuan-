import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64
const N = 16_384
const R = 8
const P = 1
const MAX_MEMORY = 64 * 1024 * 1024

async function derive(password, salt, parameters = { N, r: R, p: P }) {
  return scrypt(password, salt, KEY_LENGTH, {
    ...parameters,
    maxmem: MAX_MEMORY,
  })
}

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await derive(password, salt)
  return [
    'scrypt',
    N,
    R,
    P,
    salt.toString('base64url'),
    Buffer.from(derived).toString('base64url'),
  ].join('$')
}

export async function verifyPassword(password, storedHash) {
  try {
    const [algorithm, n, r, p, saltText, hashText] =
      String(storedHash).split('$')
    if (algorithm !== 'scrypt') return false
    const expected = Buffer.from(hashText, 'base64url')
    if (expected.length !== KEY_LENGTH) return false
    const actual = Buffer.from(await derive(
      password,
      Buffer.from(saltText, 'base64url'),
      { N: Number(n), r: Number(r), p: Number(p) },
    ))
    return timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

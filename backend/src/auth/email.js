import { HttpError } from '../http/errors.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmail(input) {
  const email = String(input ?? '').trim().toLowerCase()
  if (
    email.length > 254 ||
    !EMAIL_PATTERN.test(email)
  ) {
    throw new HttpError(400, 'EMAIL_INVALID', '邮箱格式不正确')
  }
  return email
}

export function maskEmail(input) {
  const email = normalizeEmail(input)
  const [local, domain] = email.split('@')
  const visible = local.length <= 2
    ? `${local[0]}*`
    : `${local[0]}***${local.at(-1)}`
  return `${visible}@${domain}`
}

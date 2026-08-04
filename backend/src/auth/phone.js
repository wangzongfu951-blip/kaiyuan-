import { HttpError } from '../http/errors.js'

const MAINLAND_MOBILE_PATTERN = /^1[3-9]\d{9}$/

export function normalizeChinaPhone(input) {
  const digits = String(input ?? '').replace(/\D/g, '')
  const localNumber = digits.startsWith('86') ? digits.slice(2) : digits

  if (!MAINLAND_MOBILE_PATTERN.test(localNumber)) {
    throw new HttpError(400, 'INVALID_PHONE', '手机号格式不正确')
  }

  return `+86${localNumber}`
}

export function maskPhone(phone) {
  const normalized = normalizeChinaPhone(phone)
  const localNumber = normalized.slice(3)
  return `${localNumber.slice(0, 3)}****${localNumber.slice(-4)}`
}

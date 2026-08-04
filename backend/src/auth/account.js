import { HttpError } from '../http/errors.js'

const ACCOUNT_PATTERN = /^[a-z][a-z0-9_]{3,31}$/

export function normalizeAccount(input) {
  const account = String(input ?? '').trim().toLowerCase()
  if (!ACCOUNT_PATTERN.test(account)) {
    throw new HttpError(
      400,
      'ACCOUNT_INVALID',
      '账号格式不正确，须以字母开头并使用 4 至 32 位字母、数字或下划线',
    )
  }
  return account
}

export function validatePassword(input) {
  const password = String(input ?? '')
  if (password.length < 8) {
    throw new HttpError(
      400,
      'PASSWORD_TOO_SHORT',
      '密码至少 8 位',
    )
  }
  if (password.length > 72) {
    throw new HttpError(
      400,
      'PASSWORD_TOO_LONG',
      '密码不能超过 72 位',
    )
  }
  return password
}

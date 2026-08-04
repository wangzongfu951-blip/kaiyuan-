import { hashPassword } from './password.js'

export const DEVELOPMENT_TEST_ACCOUNT = Object.freeze({
  account: 'test_study',
  password: 'Study2026!',
  email: 'test-study@example.invalid',
})

export async function seedDevelopmentAccount({ repository, nodeEnv }) {
  if (nodeEnv === 'production') {
    throw new Error('仅允许在开发或测试环境创建测试账号')
  }

  const passwordHash = await hashPassword(DEVELOPMENT_TEST_ACCOUNT.password)
  const existing = await repository.findAccountCredential(
    DEVELOPMENT_TEST_ACCOUNT.account,
  )

  if (existing) {
    if (typeof repository.updateAccountPassword === 'function') {
      await repository.updateAccountPassword(existing.user.id, passwordHash)
    }
    if (
      typeof repository.addIdentity === 'function' &&
      !existing.user.identities.includes('email')
    ) {
      await repository.addIdentity(existing.user.id, {
        provider: 'email',
        subject: DEVELOPMENT_TEST_ACCOUNT.email,
        profile: { emailMasked: 't***y@example.invalid', development: true },
      })
    }
    return {
      account: DEVELOPMENT_TEST_ACCOUNT.account,
      created: false,
      user: existing.user,
    }
  }

  const user = await repository.registerAccount({
    account: DEVELOPMENT_TEST_ACCOUNT.account,
    passwordHash,
    binding: {
      provider: 'email',
      subject: DEVELOPMENT_TEST_ACCOUNT.email,
      profile: {
        emailMasked: 't***y@example.invalid',
        development: true,
      },
    },
  })

  return {
    account: DEVELOPMENT_TEST_ACCOUNT.account,
    created: true,
    user,
  }
}

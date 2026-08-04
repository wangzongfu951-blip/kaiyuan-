function requiredUrl(env, key, fallback) {
  const value = env[key] || fallback
  if (!value) throw new Error(`${key} is required`)
  try {
    new URL(value)
  } catch {
    throw new Error(`${key} must be a valid URL`)
  }
  return value
}

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development'
  const isTest = nodeEnv === 'test'
  const isProduction = nodeEnv === 'production'
  const developmentOtpSecret = 'development-only-change-before-deploy-2026'
  const otpSecret = env.OTP_HMAC_SECRET || (isProduction ? '' : developmentOtpSecret)

  if (otpSecret.length < 32) {
    throw new Error('OTP_HMAC_SECRET must contain at least 32 characters')
  }

  const databaseUrl = isTest
    ? env.DATABASE_URL || ''
    : requiredUrl(
        env,
        'DATABASE_URL',
        isProduction ? undefined : 'postgres://zhaotu:zhaotu@127.0.0.1:5432/zhaotu',
      )
  const redisUrl = isTest
    ? env.REDIS_URL || ''
    : requiredUrl(
        env,
        'REDIS_URL',
        isProduction ? undefined : 'redis://127.0.0.1:6379',
      )

  return Object.freeze({
    nodeEnv,
    port: Number(env.PORT || 3000),
    appOrigin: requiredUrl(
      env,
      'APP_ORIGIN',
      isProduction ? undefined : 'http://localhost:5173',
    ),
    databaseUrl,
    redisUrl,
    cookieName: env.SESSION_COOKIE_NAME || 'zt_session',
    sessionTtlDays: Number(env.SESSION_TTL_DAYS || 30),
    otpSecret,
    smsProvider: env.SMS_PROVIDER || 'development',
    emailProvider: env.EMAIL_PROVIDER || 'development',
    seedTestAccount:
      !isProduction && env.SEED_TEST_ACCOUNT !== 'false',
    developmentStandalone:
      !isProduction && env.DEVELOPMENT_STANDALONE !== 'false',
    wechat: Object.freeze({
      appId: env.WECHAT_APP_ID || '',
      appSecret: env.WECHAT_APP_SECRET || '',
      redirectUri: env.WECHAT_REDIRECT_URI || '',
    }),
  })
}

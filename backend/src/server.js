import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { app as legacyApp } from './index.js'
import { createPostgres } from './infrastructure/postgres.js'
import { MemoryRedis } from './infrastructure/memory-redis.js'
import {
  closeRedis,
  connectRedis,
  createRedis,
} from './infrastructure/redis.js'
import { AuthRepository } from './auth/auth-repository.js'
import { SqliteAuthRepository } from './auth/sqlite-auth-repository.js'
import { AuthService } from './auth/auth-service.js'
import { OtpStore } from './auth/otp-store.js'
import { createSmsProvider } from './auth/sms-provider.js'
import { createEmailProvider } from './auth/email-provider.js'
import { seedDevelopmentAccount } from './auth/development-account.js'
import { WechatProvider } from './auth/wechat-provider.js'
import { OAuthStateStore } from './auth/oauth-state-store.js'
import { createAuthRouter } from './auth/auth-router.js'
import { SyncRepository } from './sync/sync-repository.js'
import { SyncService } from './sync/sync-service.js'
import { createSyncRouter } from './sync/sync-router.js'

export async function startServer({
  config = loadConfig(),
  compatibilityApp = legacyApp,
} = {}) {
  let postgres = null
  let redis
  let repository

  if (config.developmentStandalone) {
    redis = new MemoryRedis()
    repository = new SqliteAuthRepository()
  } else {
    postgres = createPostgres(config.databaseUrl)
    redis = createRedis(config.redisUrl)
    try {
      await connectRedis(redis)
    } catch (error) {
      await postgres.end()
      throw error
    }
    repository = new AuthRepository(postgres)
  }

  const smsProvider = createSmsProvider(config)
  const otpStore = new OtpStore({
    redis,
    hmacSecret: config.otpSecret,
    smsProvider,
  })
  const emailOtpStore = new OtpStore({
    redis,
    hmacSecret: config.otpSecret,
    deliveryProvider: createEmailProvider(config),
    namespace: 'email-otp',
    recipientField: 'email',
  })
  const authService = new AuthService({
    repository,
    otpStore,
    emailOtpStore,
    sessionTtlDays: config.sessionTtlDays,
  })
  if (config.seedTestAccount) {
    const seeded = await seedDevelopmentAccount({
      repository,
      nodeEnv: config.nodeEnv,
    })
    console.log(`Development test account ready: ${seeded.account}`)
  }
  const wechatProvider = new WechatProvider({
    ...config.wechat,
  })
  const oauthStateStore = new OAuthStateStore({ redis })
  const authRouter = createAuthRouter({
    authService,
    wechatProvider,
    oauthStateStore,
    config,
  })
  let syncService = null
  let syncRouter = null
  if (postgres) {
    const syncRepository = new SyncRepository(postgres)
    syncService = new SyncService({ repository: syncRepository })
    syncRouter = createSyncRouter({
      syncService,
      authService,
      config,
    })
  }
  const app = createApp({
    authRouter,
    syncRouter,
    legacyApp: compatibilityApp,
  })

  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(config.port, '0.0.0.0', () => {
      resolve(instance)
    })
    instance.once('error', reject)
  })

  let closing = false
  async function close() {
    if (closing) return
    closing = true
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
    if (config.developmentStandalone) {
      repository.close()
      await redis.quit()
    } else {
      await Promise.all([
        closeRedis(redis),
        postgres.end(),
      ])
    }
  }

  function shutdown(signal) {
    console.log(`${signal}: closing application services`)
    close().catch((error) => {
      console.error('[Shutdown]', error)
      process.exitCode = 1
    })
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))

  console.log(`Backend listening on http://0.0.0.0:${config.port}`)
  console.log(`Environment: ${config.nodeEnv}`)
  if (config.developmentStandalone) {
    console.log('Development standalone storage: SQLite + in-memory OTP state')
  }

  return {
    app,
    server,
    close,
    dependencies: { postgres, redis, authService, syncService, repository },
  }
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  startServer().catch((error) => {
    console.error('[Startup]', error)
    process.exitCode = 1
  })
}

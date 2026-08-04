import express from 'express'
import cookieParser from 'cookie-parser'
import { errorHandler, notFoundHandler } from './http/errors.js'

export function createApp({
  now = () => new Date(),
  authRouter,
  syncRouter,
  legacyApp,
} = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '32kb' }))
  app.use(cookieParser())

  app.get('/api/v1/health', (_req, res) => {
    res.json({
      ok: true,
      version: 'v1',
      time: now().toISOString(),
    })
  })

  if (authRouter) app.use('/api/v1/auth', authRouter)
  if (syncRouter) app.use('/api/v1/sync', syncRouter)
  if (legacyApp) app.use(legacyApp)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}


import express from 'express'
import { createSessionMiddleware } from '../auth/session-middleware.js'

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function createSyncRouter({ syncService, authService, config }) {
  const router = express.Router()
  const session = createSessionMiddleware({
    authService,
    cookieName: config.cookieName,
  })

  router.use(session.optionalUser)
  router.use(session.requireUser)

  router.post('/events', asyncRoute(async (req, res) => {
    const result = await syncService.pushEvents(req.user.id, req.body?.events)
    res.json({ ok: true, data: result })
  }))

  router.get('/cursor', asyncRoute(async (req, res) => {
    const result = await syncService.pullEvents(
      req.user.id,
      req.query.after === undefined ? 0 : Number(req.query.after),
      req.query.limit === undefined ? 200 : Number(req.query.limit),
    )
    res.json({ ok: true, data: result })
  }))

  return router
}

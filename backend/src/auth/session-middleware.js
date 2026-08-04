import { HttpError } from '../http/errors.js'

export function createSessionMiddleware({ authService, cookieName }) {
  async function optionalUser(req, _res, next) {
    try {
      const token = req.cookies?.[cookieName]
      if (!token) return next()

      const user = await authService.authenticateSession(token)
      if (user) {
        req.user = user
        req.sessionToken = token
      }
      return next()
    } catch (error) {
      return next(error)
    }
  }

  function requireUser(req, _res, next) {
    if (!req.user) {
      return next(new HttpError(401, 'AUTH_REQUIRED', '请先登录'))
    }
    return next()
  }

  return { optionalUser, requireUser }
}

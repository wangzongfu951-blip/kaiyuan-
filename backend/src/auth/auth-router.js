import express from 'express'
import { HttpError } from '../http/errors.js'
import {
  clearSessionCookieOptions,
  sessionCookieOptions,
} from '../http/cookies.js'
import { createSessionMiddleware } from './session-middleware.js'

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

function requiredString(value, field, { min = 1, max = 200 } = {}) {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max
  ) {
    throw new HttpError(400, 'INVALID_INPUT', `${field}格式不正确`)
  }
  return value.trim()
}

function optionalString(value, field, max = 80) {
  if (value === undefined || value === null || value === '') return undefined
  return requiredString(value, field, { max })
}

export function createAuthRouter({
  authService,
  wechatProvider,
  oauthStateStore,
  config,
}) {
  const router = express.Router()
  const session = createSessionMiddleware({
    authService,
    cookieName: config.cookieName,
  })

  router.use(session.optionalUser)

  router.post('/account/code', asyncRoute(async (req, res) => {
    const bindingType = requiredString(
      req.body?.bindingType,
      '绑定方式',
      { max: 10 },
    )
    if (bindingType !== 'phone' && bindingType !== 'email') {
      throw new HttpError(
        400,
        'REGISTRATION_BINDING_REQUIRED',
        '注册账号必须绑定手机号或邮箱',
      )
    }
    const bindingValue = requiredString(
      req.body?.bindingValue,
      bindingType === 'phone' ? '手机号' : '邮箱',
      { max: bindingType === 'phone' ? 30 : 254 },
    )
    const result = await authService.requestRegistrationCode({
      bindingType,
      bindingValue,
    })
    const data = { sent: true }

    if (
      config.nodeEnv !== 'production' &&
      result?.developmentCode
    ) {
      data.developmentCode = String(result.developmentCode)
    }

    res.json({ ok: true, data })
  }))

  router.post('/account/register', asyncRoute(async (req, res) => {
    const account = requiredString(req.body?.account, '账号', {
      min: 4,
      max: 32,
    })
    const password = requiredString(req.body?.password, '密码', {
      min: 8,
      max: 72,
    })
    const bindingType = requiredString(
      req.body?.bindingType,
      '绑定方式',
      { max: 10 },
    )
    if (bindingType !== 'phone' && bindingType !== 'email') {
      throw new HttpError(
        400,
        'REGISTRATION_BINDING_REQUIRED',
        '注册账号必须绑定手机号或邮箱',
      )
    }
    const bindingValue = requiredString(
      req.body?.bindingValue,
      bindingType === 'phone' ? '手机号' : '邮箱',
      { max: bindingType === 'phone' ? 30 : 254 },
    )
    const code = requiredString(req.body?.code, '验证码', {
      min: 4,
      max: 8,
    })
    const deviceName = optionalString(req.body?.deviceName, '设备名称')
    const result = await authService.registerWithAccount({
      account,
      password,
      bindingType,
      bindingValue,
      code,
      deviceName,
    })

    res.cookie(
      config.cookieName,
      result.sessionToken,
      sessionCookieOptions(config),
    )
    res.json({
      ok: true,
      data: {
        user: result.user,
        expiresAt: result.expiresAt,
      },
    })
  }))

  router.post('/account/login', asyncRoute(async (req, res) => {
    const account = requiredString(req.body?.account, '账号', {
      min: 4,
      max: 32,
    })
    const password = requiredString(req.body?.password, '密码', {
      min: 8,
      max: 72,
    })
    const deviceName = optionalString(req.body?.deviceName, '设备名称')
    const result = await authService.loginWithAccount({
      account,
      password,
      deviceName,
    })

    res.cookie(
      config.cookieName,
      result.sessionToken,
      sessionCookieOptions(config),
    )
    res.json({
      ok: true,
      data: {
        user: result.user,
        expiresAt: result.expiresAt,
      },
    })
  }))

  router.post('/phone/code', asyncRoute(async (req, res) => {
    const phone = requiredString(req.body?.phone, '手机号', { max: 30 })
    const result = await authService.requestPhoneCode(phone)
    const data = { sent: true }

    if (
      config.nodeEnv !== 'production' &&
      result?.developmentCode
    ) {
      data.developmentCode = String(result.developmentCode)
    }

    res.json({ ok: true, data })
  }))

  router.post('/phone/login', asyncRoute(async (req, res) => {
    const phone = requiredString(req.body?.phone, '手机号', { max: 30 })
    const code = requiredString(req.body?.code, '验证码', {
      min: 4,
      max: 8,
    })
    const deviceName = optionalString(req.body?.deviceName, '设备名称')
    const result = await authService.loginWithPhone({
      phone,
      code,
      deviceName,
    })

    res.cookie(
      config.cookieName,
      result.sessionToken,
      sessionCookieOptions(config),
    )
    res.json({
      ok: true,
      data: {
        user: result.user,
        expiresAt: result.expiresAt,
      },
    })
  }))

  router.post(
    '/phone/bind',
    session.requireUser,
    asyncRoute(async (req, res) => {
      const phone = requiredString(req.body?.phone, '手机号', { max: 30 })
      const code = requiredString(req.body?.code, '验证码', {
        min: 4,
        max: 8,
      })
      const result = await authService.bindPhone(req.user.id, { phone, code })
      res.json({ ok: true, data: result })
    }),
  )

  router.get('/wechat/url', asyncRoute(async (req, res) => {
    const mode = req.query.mode === 'qr' ? 'qr' : 'mobile'
    const purpose = req.query.purpose === 'bind' ? 'bind' : 'login'
    if (purpose === 'bind' && !req.user) {
      throw new HttpError(401, 'AUTH_REQUIRED', '请先登录')
    }
    const context = purpose === 'bind'
      ? { mode, purpose, userId: req.user.id }
      : mode
    const state = await oauthStateStore.create(context)
    const url = wechatProvider.createAuthorizeUrl(mode, state)
    res.json({ ok: true, data: { url } })
  }))

  router.get('/wechat/callback', asyncRoute(async (req, res) => {
    const code = requiredString(req.query.code, '微信授权码', { max: 200 })
    const state = requiredString(req.query.state, '微信授权状态', { max: 200 })
    const context = await oauthStateStore.consume(state)
    if (!context) {
      throw new HttpError(
        400,
        'WECHAT_STATE_INVALID',
        '微信授权已失效，请重新尝试',
      )
    }

    const identity = await wechatProvider.exchangeCode(code)
    if (typeof context === 'object' && context.purpose === 'bind') {
      if (!req.user || req.user.id !== context.userId) {
        throw new HttpError(
          401,
          'WECHAT_BIND_SESSION_INVALID',
          '绑定会话已失效，请重新登录',
        )
      }
      await authService.bindIdentity(req.user.id, identity)
      const destination = new URL('/profile', config.appOrigin)
      destination.searchParams.set('wechat', 'bound')
      return res.redirect(302, destination.toString())
    }

    const mode = typeof context === 'string' ? context : context.mode
    const result = await authService.loginWithWechat(
      identity,
      mode === 'qr' ? '电脑微信' : '手机微信',
    )
    res.cookie(
      config.cookieName,
      result.sessionToken,
      sessionCookieOptions(config),
    )

    const destination = new URL('/auth/wechat/callback', config.appOrigin)
    destination.searchParams.set('status', 'success')
    res.redirect(302, destination.toString())
  }))

  router.post(
    '/wechat/bind',
    session.requireUser,
    asyncRoute(async (req, res) => {
      const code = requiredString(req.body?.code, '微信授权码', { max: 200 })
      const state = requiredString(
        req.body?.state,
        '微信授权状态',
        { max: 200 },
      )
      const mode = await oauthStateStore.consume(state)
      if (!mode) {
        throw new HttpError(
          400,
          'WECHAT_STATE_INVALID',
          '微信授权已失效，请重新尝试',
        )
      }
      const identity = await wechatProvider.exchangeCode(code)
      const result = await authService.bindIdentity(req.user.id, identity)
      res.json({ ok: true, data: result })
    }),
  )

  router.get('/me', session.requireUser, (req, res) => {
    res.json({ ok: true, data: { user: req.user } })
  })

  router.post('/logout', asyncRoute(async (req, res) => {
    if (req.sessionToken) {
      await authService.logout(req.sessionToken)
    }
    res.clearCookie(
      config.cookieName,
      clearSessionCookieOptions(config),
    )
    res.json({ ok: true })
  }))

  router.post(
    '/logout-all',
    session.requireUser,
    asyncRoute(async (req, res) => {
      await authService.logoutAll(req.user.id)
      res.clearCookie(
        config.cookieName,
        clearSessionCookieOptions(config),
      )
      res.json({ ok: true })
    }),
  )

  return router
}

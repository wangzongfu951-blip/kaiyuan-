import { HttpError } from '../http/errors.js'

const AUTHORIZE_ENDPOINTS = Object.freeze({
  mobile: {
    url: 'https://open.weixin.qq.com/connect/oauth2/authorize',
    scope: 'snsapi_userinfo',
  },
  qr: {
    url: 'https://open.weixin.qq.com/connect/qrconnect',
    scope: 'snsapi_login',
  },
})

function authorizationError() {
  return new HttpError(
    502,
    'WECHAT_AUTH_FAILED',
    '微信授权失败，请重新尝试',
  )
}

export class WechatProvider {
  constructor({
    appId,
    appSecret,
    redirectUri,
    fetchFn = globalThis.fetch,
  }) {
    this.appId = appId
    this.appSecret = appSecret
    this.redirectUri = redirectUri
    this.fetch = fetchFn
  }

  createAuthorizeUrl(mode, state) {
    if (!state) {
      throw new HttpError(400, 'WECHAT_STATE_REQUIRED', '微信授权状态无效')
    }
    const endpoint = AUTHORIZE_ENDPOINTS[mode]
    if (!endpoint) {
      throw new HttpError(400, 'WECHAT_MODE_INVALID', '微信登录方式无效')
    }
    if (!this.appId || !this.redirectUri) {
      throw new HttpError(
        503,
        'WECHAT_NOT_CONFIGURED',
        '微信登录尚未配置',
      )
    }

    const url = new URL(endpoint.url)
    url.searchParams.set('appid', this.appId)
    url.searchParams.set('redirect_uri', this.redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', endpoint.scope)
    url.searchParams.set('state', state)
    return `${url.toString()}#wechat_redirect`
  }

  async getJson(url) {
    const response = await this.fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw authorizationError()
    const body = await response.json()
    if (body.errcode) throw authorizationError()
    return body
  }

  async exchangeCode(code) {
    if (!code || !this.appId || !this.appSecret) {
      throw authorizationError()
    }

    try {
      const tokenUrl = new URL(
        'https://api.weixin.qq.com/sns/oauth2/access_token',
      )
      tokenUrl.searchParams.set('appid', this.appId)
      tokenUrl.searchParams.set('secret', this.appSecret)
      tokenUrl.searchParams.set('code', code)
      tokenUrl.searchParams.set('grant_type', 'authorization_code')
      const token = await this.getJson(tokenUrl)

      if (!token.access_token || !token.openid) throw authorizationError()

      const profileUrl = new URL(
        'https://api.weixin.qq.com/sns/userinfo',
      )
      profileUrl.searchParams.set('access_token', token.access_token)
      profileUrl.searchParams.set('openid', token.openid)
      profileUrl.searchParams.set('lang', 'zh_CN')
      const profile = await this.getJson(profileUrl)
      const openid = profile.openid || token.openid
      const unionid = profile.unionid || token.unionid || null

      return {
        provider: 'wechat',
        subject: unionid || openid,
        profile: {
          openid,
          unionid,
          nickname: profile.nickname || '微信用户',
          avatarUrl: profile.headimgurl || null,
        },
      }
    } catch {
      throw authorizationError()
    }
  }
}

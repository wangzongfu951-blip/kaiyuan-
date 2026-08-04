import { HttpError } from '../http/errors.js'

export class DevelopmentEmailProvider {
  async sendCode({ code }) {
    return { developmentCode: String(code) }
  }
}

export class UnconfiguredEmailProvider {
  async sendCode() {
    throw new HttpError(
      503,
      'EMAIL_PROVIDER_UNAVAILABLE',
      '邮箱验证码服务尚未配置，请稍后再试',
    )
  }
}

export function createEmailProvider(config) {
  return config.nodeEnv === 'production'
    ? new UnconfiguredEmailProvider()
    : new DevelopmentEmailProvider()
}

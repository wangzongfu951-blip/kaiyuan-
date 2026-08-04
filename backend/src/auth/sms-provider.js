import { HttpError } from '../http/errors.js'

export class DevelopmentSmsProvider {
  async sendCode({ code }) {
    return { developmentCode: String(code) }
  }
}

export class UnconfiguredSmsProvider {
  async sendCode() {
    throw new HttpError(
      503,
      'SMS_PROVIDER_UNAVAILABLE',
      '短信服务尚未配置，请稍后再试',
    )
  }
}

export function createSmsProvider(config) {
  return config.nodeEnv === 'production'
    ? new UnconfiguredSmsProvider()
    : new DevelopmentSmsProvider()
}

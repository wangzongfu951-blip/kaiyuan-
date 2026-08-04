import { http } from './http'

export interface AuthUser {
  id: string
  displayName: string
  avatarUrl?: string | null
  phone?: string
  email?: string
  identities: Array<'account' | 'phone' | 'email' | 'wechat'>
}

interface DataResponse<T> {
  ok: true
  data: T
}

export interface PhoneCodeResult {
  sent: true
  developmentCode?: string
}

export interface LoginResult {
  user: AuthUser
  expiresAt: string
}

export type RegistrationBinding = 'phone' | 'email'

export const authApi = {
  requestPhoneCode(phone: string) {
    return http<DataResponse<PhoneCodeResult>>('/auth/phone/code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    })
  },

  loginWithPhone(input: {
    phone: string
    code: string
    deviceName?: string
  }) {
    return http<DataResponse<LoginResult>>('/auth/phone/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  requestRegistrationCode(input: {
    bindingType: RegistrationBinding
    bindingValue: string
  }) {
    return http<DataResponse<PhoneCodeResult>>('/auth/account/code', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  registerWithAccount(input: {
    account: string
    password: string
    bindingType: RegistrationBinding
    bindingValue: string
    code: string
    deviceName?: string
  }) {
    return http<DataResponse<LoginResult>>('/auth/account/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  loginWithAccount(input: {
    account: string
    password: string
    deviceName?: string
  }) {
    return http<DataResponse<LoginResult>>('/auth/account/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  getWechatUrl(mode: 'mobile' | 'qr', purpose: 'login' | 'bind' = 'login') {
    return http<DataResponse<{ url: string }>>(
      `/auth/wechat/url?mode=${mode}&purpose=${purpose}`,
    )
  },

  bindPhone(input: { phone: string; code: string }) {
    return http<DataResponse<{ bound: true; alreadyBound: boolean }>>(
      '/auth/phone/bind',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  },

  me() {
    return http<DataResponse<{ user: AuthUser }>>('/auth/me')
  },

  logout() {
    return http<{ ok: true }>('/auth/logout', { method: 'POST' })
  },

  logoutAll() {
    return http<{ ok: true }>('/auth/logout-all', { method: 'POST' })
  },
}

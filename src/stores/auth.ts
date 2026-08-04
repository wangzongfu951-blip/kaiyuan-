import { reactive } from 'vue'
import { authApi, type AuthUser } from '../services/auth'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'guest'

const state = reactive<{
  status: AuthStatus
  user: AuthUser | null
  error: string
}>({
  status: 'idle',
  user: null,
  error: '',
})

let currentLoad: Promise<AuthUser | null> | null = null

async function load(force = false) {
  if (!force && state.status === 'authenticated') return state.user
  if (!force && state.status === 'guest') return null
  if (currentLoad) return currentLoad

  state.status = 'loading'
  state.error = ''
  currentLoad = authApi.me()
    .then(({ data }) => {
      state.user = data.user
      state.status = 'authenticated'
      return data.user
    })
    .catch((error: Error) => {
      state.user = null
      state.status = 'guest'
      state.error = error.message
      return null
    })
    .finally(() => {
      currentLoad = null
    })
  return currentLoad
}

async function loginWithPhone(input: {
  phone: string
  code: string
  deviceName?: string
}) {
  state.error = ''
  const { data } = await authApi.loginWithPhone(input)
  state.user = data.user
  state.status = 'authenticated'
  return data
}

async function loginWithAccount(input: {
  account: string
  password: string
  deviceName?: string
}) {
  state.error = ''
  const { data } = await authApi.loginWithAccount(input)
  state.user = data.user
  state.status = 'authenticated'
  return data
}

async function registerWithAccount(input: {
  account: string
  password: string
  bindingType: 'phone' | 'email'
  bindingValue: string
  code: string
  deviceName?: string
}) {
  state.error = ''
  const { data } = await authApi.registerWithAccount(input)
  state.user = data.user
  state.status = 'authenticated'
  return data
}

async function logout() {
  try {
    await authApi.logout()
  } finally {
    state.user = null
    state.status = 'guest'
    state.error = ''
  }
}

export const authStore = {
  state,
  get isAuthenticated() {
    return state.status === 'authenticated'
  },
  load,
  loginWithPhone,
  loginWithAccount,
  registerWithAccount,
  logout,
  requestPhoneCode: authApi.requestPhoneCode,
  requestRegistrationCode: authApi.requestRegistrationCode,
  getWechatUrl: authApi.getWechatUrl,
  bindPhone: authApi.bindPhone,
}

export function useAuthStore() {
  return authStore
}

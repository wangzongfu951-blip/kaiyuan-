<template>
  <div class="account-panel">
    <div class="mode-heading">
      <div>
        <h3>{{ mode === 'login' ? '账号密码登录' : '注册学习账号' }}</h3>
        <p>
          {{
            mode === 'login'
              ? '使用账号和密码同步学习记录'
              : '注册时必须绑定手机号或邮箱'
          }}
        </p>
      </div>
      <button class="mode-switch" type="button" @click="switchMode">
        {{ mode === 'login' ? '没有账号，立即注册' : '已有账号，去登录' }}
      </button>
    </div>

    <form class="account-form" @submit.prevent="submit">
      <div class="field">
        <label for="account-name">账号</label>
        <div class="input-wrap">
          <PhUser :size="20" weight="duotone" aria-hidden="true" />
          <input
            id="account-name"
            v-model.trim="account"
            data-testid="account-input"
            type="text"
            inputmode="text"
            autocomplete="username"
            autocapitalize="none"
            maxlength="32"
            placeholder="4—32 位字母、数字或下划线"
          />
        </div>
      </div>

      <div class="field">
        <label for="account-password">密码</label>
        <div class="input-wrap">
          <PhLockKey :size="20" weight="duotone" aria-hidden="true" />
          <input
            id="account-password"
            v-model="password"
            data-testid="account-password"
            :type="showPassword ? 'text' : 'password'"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            maxlength="72"
            placeholder="至少 8 位"
          />
          <button
            class="visibility-button"
            type="button"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            @click="showPassword = !showPassword"
          >
            <PhEyeSlash v-if="showPassword" :size="19" aria-hidden="true" />
            <PhEye v-else :size="19" aria-hidden="true" />
          </button>
        </div>
      </div>

      <template v-if="mode === 'register'">
        <div class="field">
          <label for="confirm-password">确认密码</label>
          <div class="input-wrap">
            <PhLockKeyOpen :size="20" weight="duotone" aria-hidden="true" />
            <input
              id="confirm-password"
              v-model="confirmPassword"
              data-testid="confirm-password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              maxlength="72"
              placeholder="再次输入密码"
            />
          </div>
        </div>

        <fieldset class="binding-field">
          <legend>绑定方式</legend>
          <div class="binding-tabs">
            <button
              type="button"
              :class="{ active: bindingType === 'phone' }"
              @click="setBindingType('phone')"
            >
              <PhDeviceMobile :size="18" aria-hidden="true" />
              绑定手机号
            </button>
            <button
              type="button"
              :class="{ active: bindingType === 'email' }"
              @click="setBindingType('email')"
            >
              <PhEnvelopeSimple :size="18" aria-hidden="true" />
              绑定邮箱
            </button>
          </div>
        </fieldset>

        <div class="field">
          <label for="binding-value">
            {{ bindingType === 'phone' ? '手机号' : '邮箱' }}
          </label>
          <div class="input-wrap">
            <PhDeviceMobile
              v-if="bindingType === 'phone'"
              :size="20"
              weight="duotone"
              aria-hidden="true"
            />
            <PhEnvelopeSimple
              v-else
              :size="20"
              weight="duotone"
              aria-hidden="true"
            />
            <input
              id="binding-value"
              v-model.trim="bindingValue"
              data-testid="binding-input"
              :type="bindingType === 'phone' ? 'tel' : 'email'"
              :inputmode="bindingType === 'phone' ? 'numeric' : 'email'"
              :autocomplete="bindingType === 'phone' ? 'tel' : 'email'"
              :maxlength="bindingType === 'phone' ? 11 : 254"
              :placeholder="
                bindingType === 'phone'
                  ? '请输入 11 位手机号'
                  : '请输入常用邮箱'
              "
              :disabled="codeRequested"
              @input="normalizeBindingInput"
            />
          </div>
        </div>

        <div class="field">
          <label for="registration-code">验证码</label>
          <div class="code-row">
            <div class="input-wrap">
              <PhKey :size="20" weight="duotone" aria-hidden="true" />
              <input
                id="registration-code"
                ref="codeInput"
                v-model.trim="code"
                data-testid="registration-code"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="6 位验证码"
                @input="onlyCodeDigits"
              />
            </div>
            <button
              class="code-button"
              type="button"
              data-testid="registration-code-button"
              :disabled="sendingCode || countdown > 0"
              @click="requestCode"
            >
              {{
                sendingCode
                  ? '发送中'
                  : countdown > 0
                    ? `${countdown} 秒`
                    : codeRequested
                      ? '重新获取'
                      : '获取验证码'
              }}
            </button>
          </div>
          <p v-if="developmentCode" class="development-code">
            本地调试验证码：{{ developmentCode }}
          </p>
        </div>
      </template>

      <p v-if="error" class="form-error" role="alert">
        <PhWarningCircle :size="18" weight="fill" aria-hidden="true" />
        <span>{{ error }}</span>
      </p>

      <button
        class="primary-button"
        type="submit"
        :disabled="submitting"
        :data-testid="mode === 'login' ? 'account-login' : 'account-register'"
      >
        <PhSpinnerGap
          v-if="submitting"
          class="spin"
          :size="21"
          aria-hidden="true"
        />
        <span>
          {{
            submitting
              ? mode === 'login' ? '正在登录' : '正在注册'
              : mode === 'login' ? '登录并同步学习进度' : '注册并开始学习'
          }}
        </span>
        <PhArrowRight v-if="!submitting" :size="20" aria-hidden="true" />
      </button>
    </form>

    <div v-if="isDevelopment && mode === 'login'" class="test-account">
      <div>
        <strong>本地测试账号</strong>
        <span>test_study · Study2026!</span>
      </div>
      <button type="button" data-testid="fill-test-account" @click="fillTestAccount">
        一键填入
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import {
  PhArrowRight,
  PhDeviceMobile,
  PhEnvelopeSimple,
  PhEye,
  PhEyeSlash,
  PhKey,
  PhLockKey,
  PhLockKeyOpen,
  PhSpinnerGap,
  PhUser,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import { useAuthStore } from '../../stores/auth'

const emit = defineEmits<{
  success: []
}>()

const auth = useAuthStore()
const isDevelopment = import.meta.env.DEV
const mode = ref<'login' | 'register'>('login')
const account = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const bindingType = ref<'phone' | 'email'>('phone')
const bindingValue = ref('')
const code = ref('')
const codeRequested = ref(false)
const developmentCode = ref('')
const countdown = ref(0)
const sendingCode = ref(false)
const submitting = ref(false)
const error = ref('')
const codeInput = ref<HTMLInputElement | null>(null)
let countdownTimer: number | undefined

function deviceName() {
  return /iPad|Tablet/i.test(navigator.userAgent) ? '平板' : '手机'
}

function switchMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
  code.value = ''
  confirmPassword.value = ''
  resetRequestedCode()
}

function setBindingType(type: 'phone' | 'email') {
  bindingType.value = type
  bindingValue.value = ''
  code.value = ''
  error.value = ''
  resetRequestedCode()
}

function resetRequestedCode() {
  window.clearInterval(countdownTimer)
  countdown.value = 0
  codeRequested.value = false
  developmentCode.value = ''
}

function normalizeBindingInput(event: Event) {
  if (bindingType.value !== 'phone') return
  bindingValue.value = (event.target as HTMLInputElement).value
    .replace(/\D/g, '')
    .slice(0, 11)
}

function onlyCodeDigits(event: Event) {
  code.value = (event.target as HTMLInputElement).value
    .replace(/\D/g, '')
    .slice(0, 6)
}

function validateAccountFields() {
  if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(account.value)) {
    error.value = '账号需以字母开头，使用 4—32 位字母、数字或下划线'
    return false
  }
  if (password.value.length < 8 || password.value.length > 72) {
    error.value = '密码长度需为 8—72 位'
    return false
  }
  return true
}

function validateBinding() {
  if (
    bindingType.value === 'phone' &&
    !/^1[3-9]\d{9}$/.test(bindingValue.value)
  ) {
    error.value = '请输入正确的 11 位手机号'
    return false
  }
  if (
    bindingType.value === 'email' &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bindingValue.value)
  ) {
    error.value = '请输入正确的邮箱地址'
    return false
  }
  return true
}

function beginCountdown() {
  window.clearInterval(countdownTimer)
  countdown.value = 60
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) window.clearInterval(countdownTimer)
  }, 1000)
}

async function requestCode() {
  if (!validateBinding()) return
  sendingCode.value = true
  error.value = ''
  try {
    const { data } = await auth.requestRegistrationCode({
      bindingType: bindingType.value,
      bindingValue: bindingValue.value,
    })
    developmentCode.value = data.developmentCode || ''
    codeRequested.value = true
    beginCountdown()
    await nextTick()
    codeInput.value?.focus()
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    sendingCode.value = false
  }
}

async function submit() {
  if (!validateAccountFields()) return
  if (mode.value === 'register') {
    if (password.value !== confirmPassword.value) {
      error.value = '两次输入的密码不一致'
      return
    }
    if (!validateBinding()) return
    if (!/^\d{4,8}$/.test(code.value)) {
      error.value = '请输入收到的验证码'
      return
    }
  }

  submitting.value = true
  error.value = ''
  try {
    if (mode.value === 'login') {
      await auth.loginWithAccount({
        account: account.value,
        password: password.value,
        deviceName: deviceName(),
      })
    } else {
      await auth.registerWithAccount({
        account: account.value,
        password: password.value,
        bindingType: bindingType.value,
        bindingValue: bindingValue.value,
        code: code.value,
        deviceName: deviceName(),
      })
    }
    emit('success')
  } catch (submitError) {
    error.value = (submitError as Error).message
  } finally {
    submitting.value = false
  }
}

function fillTestAccount() {
  account.value = 'test_study'
  password.value = 'Study2026!'
  error.value = ''
}

onBeforeUnmount(() => window.clearInterval(countdownTimer))
</script>

<style scoped>
.account-panel,
.account-form {
  display: grid;
  gap: 16px;
}

.mode-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.mode-heading h3 {
  margin: 0 0 4px;
  color: #202944;
  font-size: 16px;
}

.mode-heading p {
  margin: 0;
  color: #7b859d;
  font-size: 12px;
  line-height: 1.5;
}

.mode-switch {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 0 2px;
  border: 0;
  color: #4f60c8;
  background: transparent;
  font-size: 12px;
  font-weight: 700;
}

.field {
  display: grid;
  gap: 8px;
}

label,
legend {
  color: #2d3550;
  font-size: 14px;
  font-weight: 650;
}

.input-wrap {
  display: flex;
  min-width: 0;
  min-height: 50px;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  color: #6574a5;
  border: 1px solid rgba(216, 223, 240, 0.82);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.58);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.input-wrap:focus-within {
  border-color: #6675de;
  box-shadow: 0 0 0 4px rgba(90, 108, 216, 0.12);
}

input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: #151b2f;
  background: transparent;
  font: inherit;
  font-size: 16px;
}

input::placeholder {
  color: #9aa4bd;
}

input:disabled {
  color: #7f879b;
}

.visibility-button {
  display: grid;
  flex: 0 0 38px;
  width: 38px;
  height: 42px;
  place-items: center;
  margin-right: -10px;
  border: 0;
  color: #78839f;
  background: transparent;
}

.binding-field {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.binding-field legend {
  margin-bottom: 8px;
}

.binding-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.binding-tabs button {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #dce2f0;
  border-radius: 12px;
  color: #74809c;
  background: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  font-weight: 700;
}

.binding-tabs button.active {
  border-color: #8e9bea;
  color: #4053c1;
  background: rgba(239, 242, 255, 0.88);
}

.code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 100px;
  gap: 10px;
}

.code-button {
  min-height: 50px;
  border: 1px solid #d9e0ef;
  border-radius: 14px;
  color: #4f60c8;
  background: rgba(255, 255, 255, 0.62);
  font-weight: 650;
}

.code-button:disabled {
  color: #99a2b8;
  background: #f7f8fb;
}

.development-code {
  margin: 0;
  color: #4f60c8;
  font-size: 12px;
}

.form-error {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: -2px 0 0;
  color: #c44052;
  font-size: 13px;
  line-height: 1.5;
}

.form-error svg {
  flex: 0 0 auto;
  margin-top: 1px;
}

.primary-button {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 0;
  border-radius: 15px;
  color: #fff;
  background: #4d60d4;
  box-shadow: 0 12px 24px rgba(65, 82, 182, 0.22);
  font-size: 16px;
  font-weight: 750;
}

.primary-button:hover:not(:disabled) {
  background: #4052c1;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.test-account {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 13px;
  border: 1px dashed #cfd6ed;
  border-radius: 13px;
  color: #6d7895;
  background: rgba(247, 248, 253, 0.66);
  font-size: 11px;
}

.test-account div {
  display: grid;
  gap: 3px;
}

.test-account strong {
  color: #485574;
  font-size: 12px;
}

.test-account button {
  min-height: 38px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  color: #4053c1;
  background: #eef1ff;
  font-weight: 700;
}

.spin {
  animation: spin 800ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spin { animation: none; }
}
</style>

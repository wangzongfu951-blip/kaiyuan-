<template>
  <form class="phone-login" @submit.prevent="submit">
    <div class="field">
      <label for="login-phone">手机号</label>
      <div class="input-wrap">
        <PhDeviceMobile :size="20" weight="duotone" aria-hidden="true" />
        <input
          id="login-phone"
          v-model.trim="phone"
          data-testid="phone-input"
          type="tel"
          inputmode="numeric"
          autocomplete="tel"
          maxlength="11"
          placeholder="请输入 11 位手机号"
          :disabled="codeRequested || submitting"
          @input="onlyDigits"
        />
      </div>
    </div>

    <div v-if="codeRequested" class="field">
      <label for="login-code">短信验证码</label>
      <div class="code-row">
        <div class="input-wrap">
          <PhKey :size="20" weight="duotone" aria-hidden="true" />
          <input
            id="login-code"
            ref="codeInput"
            v-model.trim="code"
            data-testid="code-input"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="6 位验证码"
            @input="onlyCodeDigits"
          />
        </div>
        <button
          class="resend-button"
          type="button"
          :disabled="countdown > 0 || sending"
          @click="requestCode"
        >
          {{ countdown > 0 ? `${countdown} 秒` : '重新获取' }}
        </button>
      </div>
      <p class="phone-hint">验证码已发送至 {{ maskedPhone }}</p>
      <p v-if="developmentCode" class="development-code">
        本地调试验证码：{{ developmentCode }}
      </p>
    </div>

    <p v-if="error" class="form-error" role="alert">
      <PhWarningCircle :size="18" weight="fill" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>

    <button
      v-if="!codeRequested"
      class="primary-button"
      type="button"
      :disabled="sending"
      data-testid="request-code"
      @click="requestCode"
    >
      <PhSpinnerGap
        v-if="sending"
        class="spin"
        :size="21"
        aria-hidden="true"
      />
      <span>{{ sending ? '正在发送' : '获取验证码' }}</span>
    </button>

    <button
      v-else
      class="primary-button"
      type="submit"
      :disabled="submitting"
      data-testid="phone-login"
    >
      <PhSpinnerGap
        v-if="submitting"
        class="spin"
        :size="21"
        aria-hidden="true"
      />
      <span>{{ submitting ? '正在登录' : '登录并同步学习进度' }}</span>
      <PhArrowRight v-if="!submitting" :size="20" aria-hidden="true" />
    </button>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import {
  PhArrowRight,
  PhDeviceMobile,
  PhKey,
  PhSpinnerGap,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import { useAuthStore } from '../../stores/auth'

const emit = defineEmits<{
  success: []
}>()

const auth = useAuthStore()
const phone = ref('')
const code = ref('')
const codeRequested = ref(false)
const sending = ref(false)
const submitting = ref(false)
const countdown = ref(0)
const error = ref('')
const developmentCode = ref('')
const codeInput = ref<HTMLInputElement | null>(null)
let countdownTimer: number | undefined

const maskedPhone = computed(() => {
  if (phone.value.length !== 11) return phone.value
  return `${phone.value.slice(0, 3)} **** ${phone.value.slice(-4)}`
})

function onlyDigits(event: Event) {
  phone.value = (event.target as HTMLInputElement).value
    .replace(/\D/g, '')
    .slice(0, 11)
}

function onlyCodeDigits(event: Event) {
  code.value = (event.target as HTMLInputElement).value
    .replace(/\D/g, '')
    .slice(0, 6)
}

function validatePhone() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    error.value = '请输入正确的 11 位手机号'
    return false
  }
  return true
}

function beginCountdown() {
  window.clearInterval(countdownTimer)
  countdown.value = 60
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      window.clearInterval(countdownTimer)
    }
  }, 1000)
}

async function requestCode() {
  if (!validatePhone()) return
  sending.value = true
  error.value = ''
  try {
    const { data } = await auth.requestPhoneCode(phone.value)
    developmentCode.value = data.developmentCode || ''
    codeRequested.value = true
    beginCountdown()
    await nextTick()
    codeInput.value?.focus()
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    sending.value = false
  }
}

async function submit() {
  if (!/^\d{4,8}$/.test(code.value)) {
    error.value = '请输入短信验证码'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await auth.loginWithPhone({
      phone: phone.value,
      code: code.value,
      deviceName: /iPad|Tablet/i.test(navigator.userAgent)
        ? '平板'
        : '手机',
    })
    emit('success')
  } catch (loginError) {
    error.value = (loginError as Error).message
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => window.clearInterval(countdownTimer))
</script>

<style scoped>
.phone-login {
  display: grid;
  gap: 18px;
}

.field {
  display: grid;
  gap: 8px;
}

label {
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
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(216, 223, 240, 0.82);
  border-radius: 14px;
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
  background: transparent;
  color: #151b2f;
  font: inherit;
  font-size: 16px;
}

input::placeholder {
  color: #9aa4bd;
}

.code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px;
  gap: 10px;
}

.resend-button {
  min-height: 50px;
  border: 1px solid #d9e0ef;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.62);
  color: #4f60c8;
  font-weight: 650;
}

.resend-button:disabled {
  color: #99a2b8;
  background: #f7f8fb;
}

.phone-hint,
.development-code {
  margin: 0;
  color: #7d879f;
  font-size: 12px;
}

.development-code {
  color: #4f60c8;
}

.form-error {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: -4px 0 0;
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
  background: #4d60d4;
  color: #fff;
  font-size: 16px;
  font-weight: 750;
  box-shadow: 0 12px 24px rgba(65, 82, 182, 0.22);
}

.primary-button:hover:not(:disabled) {
  background: #4052c1;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
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

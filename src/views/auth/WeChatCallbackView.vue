<template>
  <main class="callback-page">
    <section class="callback-card" aria-live="polite">
      <PhSpinnerGap v-if="loading" class="spin" :size="34" />
      <PhCheckCircle v-else-if="success" :size="38" weight="fill" />
      <PhWarningCircle v-else :size="38" weight="fill" />
      <h1>{{ title }}</h1>
      <p>{{ message }}</p>
      <router-link v-if="!loading" to="/login">返回登录页</router-link>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PhCheckCircle,
  PhSpinnerGap,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(true)
const success = ref(false)
const message = ref('正在确认微信登录状态，请稍候。')
const title = computed(() => {
  if (loading.value) return '正在登录'
  return success.value ? '登录成功' : '登录未完成'
})

onMounted(async () => {
  const user = await auth.load(true)
  loading.value = false
  success.value = Boolean(user)
  if (user) {
    message.value = '学习进度已同步，正在返回首页。'
    window.setTimeout(() => router.replace('/'), 500)
  } else {
    message.value = '微信授权已失效，请返回后重新尝试。'
  }
})
</script>

<style scoped>
.callback-page {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: 24px;
  background: #f5f7fc;
}

.callback-card {
  width: min(100%, 360px);
  padding: 36px 28px;
  border: 1px solid #e0e5f1;
  border-radius: 22px;
  background: #fff;
  color: #4d60d4;
  text-align: center;
  box-shadow: 0 16px 42px rgba(35, 48, 98, 0.1);
}

h1 {
  margin: 16px 0 8px;
  color: #182036;
  font-size: 23px;
}

p {
  margin: 0;
  color: #7b859b;
  line-height: 1.7;
}

a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  margin-top: 18px;
  color: #4d60d4;
  font-weight: 700;
}

.spin {
  animation: spin 800ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

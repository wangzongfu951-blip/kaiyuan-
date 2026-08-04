import { useRoute, useRouter } from 'vue-router'

export function useSafeBack(fallback: string) {
  const route = useRoute()
  const router = useRouter()

  function safeBack() {
    const previous = window.history.state?.back
    const hasUsefulPreviousRoute = (
      typeof previous === 'string'
      && previous.length > 0
      && previous !== route.fullPath
      && !previous.startsWith('/login')
    )

    if (hasUsefulPreviousRoute) {
      router.back()
      return
    }
    router.replace(fallback)
  }

  return { safeBack }
}

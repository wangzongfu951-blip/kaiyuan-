// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; time: number }>()
const CACHE_TTL = 60 * 1000

function getCached(key: string) {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.data
  cache.delete(key)
  return null
}

function setCache(key: string, data: any) {
  cache.set(key, { data, time: Date.now() })
}

export const API_BASE = ''

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const search = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
    }
  }
  const fullUrl = `${path}${search.size ? `?${search.toString()}` : ''}`
  const cached = getCached(fullUrl)
  if (cached) return cached as T
  const res = await fetch(fullUrl, { credentials: 'include' })
  if (!res.ok) throw new Error('API Error ' + res.status)
  const data = await res.json() as T
  // Only cache successful responses (ok: true)
  const isOk = (data as any)?.ok === true
  if (isOk && path.includes('/api/idioms/') && !path.includes('/similar')) {
    setCache(fullUrl, data)
  }
  if (isOk && path.includes('/api/words/')) {
    setCache(fullUrl, data)
  }
  return data
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('API Error ' + res.status)
  return (await res.json()) as T
}

export function invalidateCache(pattern: string) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key)
  }
}

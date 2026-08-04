export class HttpError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export async function http<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new HttpError(
      response.status,
      body?.error?.code || 'REQUEST_FAILED',
      body?.error?.message || '请求失败，请稍后重试',
    )
  }

  return body as T
}

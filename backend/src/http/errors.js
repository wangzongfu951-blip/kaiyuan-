export class HttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export function notFoundHandler(_req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: '接口不存在',
    },
  })
}

export function errorHandler(error, _req, res, _next) {
  const isHttpError = error instanceof HttpError
  const status = isHttpError ? error.status : 500
  const code = isHttpError ? error.code : 'INTERNAL_ERROR'
  const message = status === 500 ? '服务暂时不可用' : error.message

  if (status === 500) console.error('[HTTP]', error)

  res.status(status).json({
    ok: false,
    error: { code, message },
  })
}


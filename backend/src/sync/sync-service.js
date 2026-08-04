import { HttpError } from '../http/errors.js'

const CLIENT_EVENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_PAYLOAD_BYTES = 16 * 1024
const MAX_BATCH_SIZE = 100
const MAX_EVENT_AGE_MS = 365 * 24 * 60 * 60 * 1000
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000
const ALLOWED_EVENT_TYPES = new Set([
  'learning.answer',
  'memory.grade',
  'favorite.add',
  'favorite.remove',
  'mistake.resolve',
  'plan.update',
  'progress.reset',
])

function validateEvent(event, now) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new HttpError(400, 'SYNC_EVENT_INVALID', '同步事件格式不正确')
  }
  if (!CLIENT_EVENT_ID_PATTERN.test(event.clientEventId || '')) {
    throw new HttpError(
      400,
      'SYNC_EVENT_ID_INVALID',
      '同步事件编号格式不正确',
    )
  }
  if (
    typeof event.deviceKey !== 'string' ||
    event.deviceKey.length < 1 ||
    event.deviceKey.length > 128
  ) {
    throw new HttpError(
      400,
      'SYNC_DEVICE_INVALID',
      '同步设备标识格式不正确',
    )
  }
  if (!ALLOWED_EVENT_TYPES.has(event.eventType)) {
    throw new HttpError(
      400,
      'SYNC_EVENT_TYPE_INVALID',
      '不支持该同步事件类型',
    )
  }
  if (
    !event.payload ||
    typeof event.payload !== 'object' ||
    Array.isArray(event.payload)
  ) {
    throw new HttpError(
      400,
      'SYNC_PAYLOAD_INVALID',
      '同步内容格式不正确',
    )
  }

  const payloadJson = JSON.stringify(event.payload)
  if (Buffer.byteLength(payloadJson, 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new HttpError(
      413,
      'SYNC_PAYLOAD_TOO_LARGE',
      '单条同步内容不能超过 16 KB',
    )
  }

  const occurredAt = new Date(event.occurredAt)
  if (
    Number.isNaN(occurredAt.getTime()) ||
    occurredAt.getTime() < now.getTime() - MAX_EVENT_AGE_MS ||
    occurredAt.getTime() > now.getTime() + MAX_FUTURE_SKEW_MS
  ) {
    throw new HttpError(
      400,
      'SYNC_TIME_INVALID',
      '同步事件时间不在允许范围内',
    )
  }

  return {
    clientEventId: event.clientEventId.toLowerCase(),
    deviceKey: event.deviceKey,
    eventType: event.eventType,
    payload: event.payload,
    occurredAt: occurredAt.toISOString(),
  }
}

export class SyncService {
  constructor({ repository, now = () => new Date() }) {
    this.repository = repository
    this.now = now
  }

  async pushEvents(userId, events) {
    if (!userId) {
      throw new HttpError(401, 'AUTH_REQUIRED', '请先登录')
    }
    if (
      !Array.isArray(events) ||
      events.length < 1 ||
      events.length > MAX_BATCH_SIZE
    ) {
      throw new HttpError(
        400,
        'SYNC_BATCH_INVALID',
        '每次须同步 1 至 100 条记录',
      )
    }

    const now = this.now()
    const validated = events.map((item) => validateEvent(item, now))
    const results = []
    for (const event of validated) {
      results.push(await this.repository.storeEvent(userId, event))
    }

    return {
      results,
      cursor: Math.max(...results.map((item) => Number(item.cursor) || 0)),
    }
  }

  async pullEvents(userId, after = 0, limit = 200) {
    if (!userId) {
      throw new HttpError(401, 'AUTH_REQUIRED', '请先登录')
    }
    const cursor = Number(after)
    const boundedLimit = Number(limit)
    if (
      !Number.isSafeInteger(cursor) ||
      cursor < 0 ||
      !Number.isSafeInteger(boundedLimit) ||
      boundedLimit < 1 ||
      boundedLimit > 500
    ) {
      throw new HttpError(
        400,
        'SYNC_CURSOR_INVALID',
        '同步游标格式不正确',
      )
    }

    const events = await this.repository.getEventsAfter(
      userId,
      cursor,
      boundedLimit,
    )
    return {
      events,
      cursor: events.length
        ? Number(events[events.length - 1].cursor)
        : cursor,
    }
  }
}

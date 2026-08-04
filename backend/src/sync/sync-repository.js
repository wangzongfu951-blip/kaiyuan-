function mapEvent(row) {
  return {
    cursor: Number(row.id),
    clientEventId: row.client_event_id,
    deviceKey: row.device_key,
    eventType: row.event_type,
    payload: row.payload,
    occurredAt: new Date(row.occurred_at).toISOString(),
    receivedAt: new Date(row.received_at).toISOString(),
  }
}

export class SyncRepository {
  constructor(pool) {
    this.pool = pool
  }

  async storeEvent(userId, event) {
    const inserted = await this.pool.query(
      `INSERT INTO sync_events
         (user_id, client_event_id, device_key, event_type, payload, occurred_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (user_id, client_event_id) DO NOTHING
       RETURNING id`,
      [
        userId,
        event.clientEventId,
        event.deviceKey,
        event.eventType,
        JSON.stringify(event.payload),
        event.occurredAt,
      ],
    )
    if (inserted.rows[0]) {
      return {
        accepted: true,
        cursor: Number(inserted.rows[0].id),
      }
    }

    const existing = await this.pool.query(
      `SELECT id
         FROM sync_events
        WHERE user_id = $1 AND client_event_id = $2`,
      [userId, event.clientEventId],
    )
    return {
      accepted: false,
      cursor: Number(existing.rows[0].id),
    }
  }

  async getEventsAfter(userId, cursor, limit) {
    const result = await this.pool.query(
      `SELECT id, client_event_id, device_key, event_type,
              payload, occurred_at, received_at
         FROM sync_events
        WHERE user_id = $1 AND id > $2
        ORDER BY id ASC
        LIMIT $3`,
      [userId, cursor, limit],
    )
    return result.rows.map(mapEvent)
  }
}

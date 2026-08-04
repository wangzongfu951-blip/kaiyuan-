import { createClient } from 'redis'

export function createRedis(redisUrl, { onError } = {}) {
  if (!redisUrl) throw new Error('REDIS_URL is required')

  const client = createClient({ url: redisUrl })
  client.on('error', onError || ((error) => {
    console.error('[Redis]', error.message)
  }))
  return client
}

export async function connectRedis(client) {
  if (!client.isOpen) await client.connect()
  return client
}

export async function closeRedis(client) {
  if (client?.isOpen) await client.quit()
}


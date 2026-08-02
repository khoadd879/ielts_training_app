import { createClient } from 'redis';

export const redis = createClient({ url: process.env.REDIS_URL });

redis.on('error', (err) => console.error('Redis error:', err));

let connected = false;
export async function ensureRedis(): Promise<void> {
  if (!connected) {
    await redis.connect();
    connected = true;
  }
}

import Redis from 'ioredis';

// Create a Redis client — connects to the same Redis instance the API gateway uses.
// Both services share one Redis so the gateway can CHECK sessions that user-service CREATES.
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('Redis connected (user-service)');
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

export default redis;

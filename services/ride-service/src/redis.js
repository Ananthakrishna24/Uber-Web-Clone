import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
};

// Connection 1: normal commands (GET, SET, DEL, etc.)
const redis = new Redis(redisConfig);

// Connection 2: dedicated subscriber (enters subscriber mode — can ONLY receive messages)
const subscriber = new Redis(redisConfig);

redis.on('connect', () => {
  console.log('Redis connected (ride-service)');
});

redis.on('error', (err) => {
  console.error('Redis error (ride-service):', err.message);
});

subscriber.on('connect', () => {
  console.log('Redis subscriber connected (ride-service)');
});

subscriber.on('error', (err) => {
  console.error('Redis subscriber error (ride-service):', err.message);
});

export default redis;
export { subscriber };

import redis from './redis.js';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

const rateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip;
    const key = `rate:${ip}`;

    // INCR atomically increments (creates key with value 1 if it doesn't exist)
    const count = await redis.incr(key);

    // If this is the first request in the window, set the TTL
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    // Get remaining TTL for the Retry-After header
    const ttl = await redis.ttl(key);

    // Set rate limit headers on every response
    res.set('X-RateLimit-Limit', String(MAX_REQUESTS));
    res.set('X-RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS - count)));

    if (count > MAX_REQUESTS) {
      res.set('Retry-After', String(ttl));
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: ttl,
      });
    }

    next();
  } catch (err) {
    // Fail open — if Redis is down, let requests through
    console.error('Rate limiter error (failing open):', err.message);
    next();
  }
};

export default rateLimiter;

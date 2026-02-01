# Task 2.3 — Rate Limiting with Redis (First Redis Usage!)

## What You'll Learn
- What **Redis** is and why it's perfect for rate limiting
- Redis as a **key-value store** with **TTL** (time-to-live)
- The `INCR` command and atomic operations
- How to protect your API from abuse with rate limiting

---

## Concept: What is Redis?

Redis is an **in-memory data store** — it keeps everything in RAM, making it extremely fast (sub-millisecond responses). Think of it like a super-fast dictionary that lives in memory.

```
PostgreSQL (disk-based):     ~1-10ms per query
Redis (memory-based):        ~0.1ms per query (10-100x faster!)
```

Redis is used for:
- **Caching** — store frequently accessed data to avoid DB queries
- **Rate limiting** — count requests per IP (what we're doing now)
- **Sessions** — store user session data
- **Pub/Sub** — real-time messaging
- **Geospatial** — store/query locations (we'll use this for drivers later!)

---

## Concept: Key-Value Store with TTL

Redis stores data as **key-value pairs**. Each key can have a **TTL** (time-to-live) — after which Redis automatically deletes it.

```
┌─────────────────────────────────────────────────┐
│                  REDIS                           │
├──────────────────────┬──────────┬───────────────┤
│ Key                  │ Value    │ TTL           │
├──────────────────────┼──────────┼───────────────┤
│ rate:192.168.1.1     │ 47       │ 38s remaining │
│ rate:10.0.0.5        │ 3        │ 55s remaining │
│ rate:172.16.0.1      │ 101      │ 12s remaining │ ← OVER LIMIT!
└──────────────────────┴──────────┴───────────────┘
```

When the TTL expires, the key disappears — the user's count resets to 0.

---

## Concept: The INCR Command (Atomic Counter)

`INCR` increments a number by 1 and returns the new value. It's **atomic** — even if 100 requests arrive at the exact same millisecond, each gets a unique count.

```
INCR "rate:192.168.1.1"   → 1   (key didn't exist, created with value 1)
INCR "rate:192.168.1.1"   → 2
INCR "rate:192.168.1.1"   → 3
...
INCR "rate:192.168.1.1"   → 101  ← over limit, reject!
```

---

## Concept: Rate Limiting Algorithm (Fixed Window)

We use a **fixed window** approach:

```
1. For each request, build a key: "rate:<IP>"
2. INCR the key (increment by 1)
3. If INCR returns 1 (new key), set EXPIRE to 60 seconds
4. If count > 100, return 429 Too Many Requests
5. After 60 seconds, key auto-deletes → counter resets

Timeline:
  0s ──────────────── 60s ──────────────── 120s
  │  window 1          │  window 2          │
  │  count: 0→47→100   │  count: 0→12       │
  │                    ↑ key expires, resets │
```

---

## Concept: What if Redis Goes Down?

This is an important system design question. If Redis is unavailable:

**Option A: Fail open** (let requests through) ← what we chose
- Rate limiting stops working, but the API stays available
- Good for: non-critical rate limiting

**Option B: Fail closed** (block all requests)
- API becomes unavailable if Redis is down
- Good for: security-critical systems (payment processing)

We chose "fail open" — better to serve users without rate limiting than to block everyone because Redis had a hiccup.

---

## What Was Built

### `src/redis.js` — Redis connection module
- Connects to Redis using ioredis
- Exports the Redis client for use across the gateway
- Logs connection status

### `src/rateLimiter.js` — Rate limiting middleware
- Key pattern: `rate:<IP>`
- Limit: 100 requests per 60-second window
- Returns `429 Too Many Requests` with `Retry-After` header when exceeded
- Adds `X-RateLimit-Limit` and `X-RateLimit-Remaining` response headers
- **Fails open** if Redis is unavailable

### Response Headers
| Header | Meaning |
|--------|---------|
| `X-RateLimit-Limit` | Max requests allowed (100) |
| `X-RateLimit-Remaining` | Requests left in this window |
| `Retry-After` | Seconds until window resets (only on 429) |

---

## Verification
- [ ] Normal requests include `X-RateLimit-*` headers
- [ ] After 100 requests, returns 429 with `Retry-After`
- [ ] Counter resets after 60 seconds
- [ ] If Redis is down, requests still go through (fail open)

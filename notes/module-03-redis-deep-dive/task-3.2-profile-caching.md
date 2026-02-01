# Task 3.2 — User Profile Caching

## The Problem: Hitting the Database Every Time

Right now, every time someone calls `GET /api/users/profile`, we run a SQL query:

```sql
SELECT id, email, name, role, ... FROM users WHERE id = $1
```

For one user checking their profile, this is fine. But imagine:
- 10,000 users refreshing their dashboards every few seconds
- Each refresh = a PostgreSQL query
- The profile data barely changes (name, email, role are mostly static)

We're hammering the database for data that's the same 99% of the time.

## The Solution: Cache-Aside Pattern (Lazy Loading)

The **cache-aside** pattern works like this:

1. **Request comes in** → Check Redis first (the cache)
2. **Cache HIT** → Return cached data immediately (skip the database entirely)
3. **Cache MISS** → Query PostgreSQL, store the result in Redis, then return it
4. **Data changes** → Delete the cache key (invalidate), so the next request fetches fresh data

```
CACHE-ASIDE PATTERN:

  GET /profile request
         │
         ▼
  ┌─────────────┐     ┌─────────────┐
  │ Check Redis │────>│  Cache HIT? │
  │ GET user:{id}│     └──────┬──────┘
  └─────────────┘           │
                     YES ───┤──── NO
                      │           │
                      ▼           ▼
               Return cached   ┌──────────┐
               data instantly  │ Query DB │
               (no DB query!)  │ SELECT...│
                               └────┬─────┘
                                    │
                                    ▼
                              ┌───────────┐
                              │ Store in  │
                              │ Redis     │
                              │ EX 300    │
                              └────┬──────┘
                                   │
                                   ▼
                              Return data
```

## Why "Cache-Aside" and Not Other Patterns?

There are several caching strategies. Cache-aside is the simplest and most common:

| Pattern | How it works | When to use |
|---------|-------------|-------------|
| **Cache-aside** | App checks cache, falls back to DB | Most read-heavy endpoints |
| Write-through | Write to cache AND DB at same time | When you need cache always fresh |
| Write-behind | Write to cache, async write to DB | High-write throughput (risky) |

Cache-aside is perfect here because:
- Profile reads are **way** more frequent than profile updates
- It's OK if the cache is slightly stale (5 min TTL)
- Simple to implement and reason about

## Cache Invalidation — "The Hard Problem"

There's a famous quote in CS: *"There are only two hard things in computer science:
cache invalidation and naming things."*

The problem: When data changes, the cache still has the OLD data. You must **invalidate**
(delete) the cache so the next read gets fresh data from the DB.

```
INVALIDATION FLOW:

  PUT /driver-profile (update vehicle info)
         │
         ▼
  ┌──────────────┐
  │ Update in DB │  (PostgreSQL has new data)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ DEL user:{id}│  (Delete stale cache)
  └──────┬───────┘
         │
         ▼
  Next GET /profile → cache MISS → fetches fresh data from DB → re-caches it
```

If you forget to invalidate, users see stale data until the TTL expires (5 minutes).
That's why we invalidate on EVERY write operation.

## Redis Commands

```
SET user:{userId} {JSON string} EX 300
│                  │              │  │
│                  │              │  └─ 300 seconds = 5 minutes
│                  │              └─── Expiry flag
│                  └──────────────── The profile data as a JSON string
└─────────────────────────────────── Key: "user:" prefix + UUID

GET user:{userId}
→ Returns the JSON string, or null (cache miss)

DEL user:{userId}
→ Removes the cached profile (invalidation)
```

**Important:** Redis stores strings. We use `JSON.stringify()` to store objects
and `JSON.parse()` to read them back.

## Code Walkthrough — Line by Line

### GET /profile — Cache-aside read

```js
const cached = await redis.get(`user:${req.user.id}`);
```
Ask Redis: "Do you have this user's profile cached?"
- Returns a JSON string if cached (HIT)
- Returns `null` if not cached or expired (MISS)

```js
if (cached) {
  console.log(`[CACHE HIT] Profile for user ${req.user.id}`);
  return res.json({ user: JSON.parse(cached) });
}
```
**Cache HIT path:** Parse the JSON string back into an object and return it.
We skip the database entirely. This is the fast path — Redis responds in <1ms
vs PostgreSQL which might take 5-20ms.

```js
console.log(`[CACHE MISS] Profile for user ${req.user.id}`);
const result = await query(
  `SELECT id, email, name, role, license_number, vehicle_info, is_available, created_at
   FROM users WHERE id = $1`,
  [req.user.id]
);
```
**Cache MISS path:** Fall back to PostgreSQL, same query as before.

```js
await redis.set(`user:${user.id}`, JSON.stringify(user), 'EX', 300);
```
After getting data from DB, **store it in Redis for next time.**
- `JSON.stringify(user)` — convert the JS object to a string (Redis only stores strings)
- `'EX', 300` — auto-expire after 5 minutes. Even if we forget to invalidate
  somewhere, the cache won't be stale for more than 5 minutes. This is a safety net.

```js
res.json({ user });
```
Return the data to the client (same response either way — client doesn't know
if it came from cache or DB).

---

### PUT /driver-profile — Cache invalidation on write

```js
await redis.del(`user:${req.user.id}`);
```
After updating the database, **delete the cached version.**
Next time GET /profile is called, it'll be a cache MISS, which means it'll
fetch the fresh data from PostgreSQL and re-cache it.

Why `DEL` instead of updating the cache with the new data?
- Simpler — don't need to build the full cache object
- Safer — avoids race conditions where the cache has partial data
- The next read will populate it automatically (cache-aside pattern)

## Your Implementation Checklist

All changes go in ONE file: `services/user-service/src/routes/auth.js`
(Redis is already imported from Task 3.1 — no new files needed!)

### Change 1: GET /profile route (~line 132)

**Where:** Inside the `router.get('/profile', ...)` handler, BEFORE the existing SQL query.
**What:** Add a Redis cache check at the top of the `try` block.
**Why:** Check the cache first so we can skip the DB query entirely on a hit.

```
Current flow:  request → query DB → return data
New flow:      request → check Redis → HIT? return cached : query DB → store in Redis → return data
```

You need to:
1. `GET user:{req.user.id}` from Redis
2. If it returned something (not null), `JSON.parse()` it and return immediately
3. If null (miss), let the existing DB query run as normal
4. After the DB query, before `res.json()`, store the result:
   `SET user:{userId} {JSON.stringify(user)} EX 300`
5. Add `console.log` for HIT and MISS so you can see it working

**Hint:** You'll need to save `result.rows[0]` into a `const user` variable
so you can both cache it and return it.

### Change 2: PUT /driver-profile route (~line 152)

**Where:** Inside the `router.put('/driver-profile', ...)` handler, AFTER the DB update succeeds.
**What:** Add ONE line to delete the cache.
**Why:** The profile just changed in the DB. The cached version is now stale (old data).
         Deleting it means the next GET /profile will be a cache MISS, which fetches
         fresh data from DB and re-caches it. This is **cache invalidation**.

```js
// Add this line after the UPDATE query, before res.json():
await redis.del(`user:${req.user.id}`);
```

That's it — two changes, one file. The cache-aside pattern in action.

---

## Verification

```bash
# 1. Login
curl -s -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# 2. First profile fetch — should be CACHE MISS (check server logs)
curl -s http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Second profile fetch — should be CACHE HIT (check server logs)
curl -s http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Check Redis directly
docker exec -it redis_cache redis-cli
> GET user:{userId}    # Should show JSON string
> TTL user:{userId}    # Should show seconds remaining (up to 300)
```

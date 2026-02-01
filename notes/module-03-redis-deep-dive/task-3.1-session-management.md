# Task 3.1 — Session Management with Redis

## The Problem: JWT Can't Do Logout

You built JWT authentication in Module 1. It works great for *verifying* who a user is.
But there's a fundamental problem — **you can't log someone out**.

### Why not?

JWTs are **stateless**. The server doesn't store them anywhere. When a user logs in,
you hand them a signed token that's valid for 24 hours. The server has no memory of
which tokens it has issued.

So when a user clicks "Logout"... what do you do?

- Delete it from the frontend? Sure, but the token is still **valid**.
- If someone copied/stole that token before logout, they can still use it.
- If an admin needs to ban a user immediately, the token keeps working until it expires.

```
THE STATELESS PROBLEM:

  Login:   Server creates JWT → gives to client → FORGETS about it
  Request: Client sends JWT   → Server verifies signature → OK ✓
  Logout:  Client deletes JWT → Server has no idea → old token STILL WORKS

  Problem: There's no "list of valid tokens" to remove from!
```

## The Solution: Redis as a Session Store

We add a **server-side session check** using Redis. Here's the idea:

1. **On Login:** Store the session in Redis with an expiry matching the JWT
2. **On Every Request:** After verifying the JWT signature, also check Redis —
   "does this session still exist?"
3. **On Logout:** Delete the session from Redis — now the token is instantly invalid

```
SESSION MANAGEMENT FLOW:

  ┌─────────┐         ┌─────────────┐         ┌─────────┐
  │  Client │         │ API Gateway │         │  Redis  │
  └────┬────┘         └──────┬──────┘         └────┬────┘
       │                     │                      │
  LOGIN FLOW:                │                      │
       │  POST /login        │                      │
       │────────────────────>│                      │
       │                     │  SET session:{userId}│
       │                     │  {token} EX 86400    │
       │                     │─────────────────────>│
       │                     │              OK      │
       │                     │<─────────────────────│
       │    { token: "..." } │                      │
       │<────────────────────│                      │
       │                     │                      │
  REQUEST FLOW:              │                      │
       │  GET /profile       │                      │
       │  + Bearer token     │                      │
       │────────────────────>│                      │
       │                     │  1. Verify JWT sig ✓ │
       │                     │  2. GET session:{uid}│
       │                     │─────────────────────>│
       │                     │    "token-value"     │
       │                     │<─────────────────────│
       │                     │  3. Token matches ✓  │
       │                     │  → Forward request   │
       │    { profile... }   │                      │
       │<────────────────────│                      │
       │                     │                      │
  LOGOUT FLOW:               │                      │
       │  POST /logout       │                      │
       │  + Bearer token     │                      │
       │────────────────────>│                      │
       │                     │  DEL session:{userId}│
       │                     │─────────────────────>│
       │                     │              1       │
       │                     │<─────────────────────│
       │    { message: "OK" }│                      │
       │<────────────────────│                      │
       │                     │                      │
  AFTER LOGOUT:              │                      │
       │  GET /profile       │                      │
       │  + Bearer token     │  (same old token)    │
       │────────────────────>│                      │
       │                     │  1. Verify JWT sig ✓ │
       │                     │  2. GET session:{uid}│
       │                     │─────────────────────>│
       │                     │       null ✗         │
       │                     │<─────────────────────│
       │                     │  3. Session gone!    │
       │   401 Unauthorized  │  → REJECT request    │
       │<────────────────────│                      │
```

## Redis Commands You'll Use

```
SET session:{userId} {token} EX 86400
│   │                │       │  │
│   │                │       │  └─ Expiry in seconds (86400 = 24 hours)
│   │                │       └─── "set EXpiry" flag
│   │                └─────────── The JWT token string
│   └──────────────────────────── Key pattern: "session:" + user's UUID
└──────────────────────────────── Redis SET command (store a string)

GET session:{userId}
→ Returns the token string, or null if expired/deleted

DEL session:{userId}
→ Deletes the key (instant logout!)
```

## Key Terms

- **Session store:** A server-side record of who's logged in. Redis is ideal because
  it's extremely fast (in-memory) and supports automatic expiry (TTL).
- **Token revocation:** The ability to make a token invalid before it naturally expires.
  JWTs alone can't do this — you need an external store.
- **Fail-open vs fail-closed:** If Redis goes down, should we let requests through
  (fail-open, like rate limiting) or block them (fail-closed)? For *auth*, we should
  probably **fail-closed** — better to reject requests than allow potentially revoked tokens.
- **EX flag:** Redis SET with EX sets a TTL. After that many seconds, the key auto-deletes.

## Where Does This Code Go?

This is the plan for what you'll implement:

1. **api-gateway** — Already has Redis connected (`src/redis.js`). You'll:
   - Add session validation to the `gatewayAuth` middleware in `index.js`
   - After JWT verification succeeds, check Redis for an active session
   - If no session found → reject with 401

2. **user-service** — Handles login. You'll:
   - Connect user-service to Redis (new `src/redis.js`)
   - After generating JWT in the login route, store it in Redis
   - Add a `POST /api/users/logout` endpoint that deletes the session

3. **api-gateway proxy** — The gateway proxies `/api/users/login` as a public route.
   After login, the user-service stores the session in Redis. The gateway then
   validates sessions on all subsequent requests.

```
ARCHITECTURE:

  Client
    │
    ▼
  API Gateway ──── Redis (session check on every request)
    │
    ▼
  User Service ─── Redis (store session on login, delete on logout)
    │
    ▼
  PostgreSQL (user data)

  Both services talk to the SAME Redis instance!
```

## Code Walkthrough — Line by Line

### File 1: `services/user-service/src/redis.js` (NEW)

```js
import Redis from 'ioredis';
```
Import the Redis client library — same one the API gateway already uses.

```js
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
});
```
Create a connection to Redis. This points to the SAME Redis instance the gateway uses
(localhost:6379). `maxRetriesPerRequest: 3` means if Redis is temporarily unreachable,
it'll retry 3 times before throwing an error.

```js
export default redis;
```
Export the client so other files can use it (like our login route).

---

### File 2: `services/user-service/src/routes/auth.js` (MODIFIED — login route)

Inside the login handler, right after `jwt.sign()` creates the token:

```js
await redis.set(`session:${user.id}`, token, 'EX', 86400);
```
**What this does, piece by piece:**
- `redis.set(...)` — Redis SET command: store a key-value pair
- `session:${user.id}` — The KEY. Example: `"session:a1b2c3d4-..."`.
  We use a prefix `session:` so these keys are easy to find among other Redis data.
- `token` — The VALUE. The full JWT string we just generated.
- `'EX', 86400` — Set an expiry of 86400 seconds (= 24 hours).
  After 24 hours, Redis automatically deletes this key — matches JWT expiry.

**Why here?** Because this is the moment we know a valid login happened.
The gateway will check for this key on every future request.

---

### File 3: `services/user-service/src/routes/auth.js` (MODIFIED — new logout route)

```js
router.post('/logout', authenticate, async (req, res) => {
```
- `POST /logout` — logout is an action, so we use POST (not GET)
- `authenticate` middleware runs first — you must prove who you are to log out
  (otherwise anyone could log out anyone else)

```js
  await redis.del(`session:${req.user.id}`);
```
**This is the entire logout.** One line.
- `redis.del(...)` — Redis DEL command: delete a key
- `session:${req.user.id}` — same key pattern as login
- After this, `GET session:{userId}` returns `null`
- The gateway sees `null` → rejects the token → user is effectively logged out

```js
  res.json({ message: 'Logged out successfully' });
```
Tell the client it worked.

---

### File 4: `services/api-gateway/index.js` (MODIFIED — gatewayAuth middleware)

The middleware was `(req, res, next) => { ... }`, now it's `async (req, res, next) => { ... }`
because we need `await` for Redis calls.

After `jwt.verify()` succeeds (the signature is valid), we add two new checks:

```js
const storedToken = await redis.get(`session:${decoded.id}`);
```
**Ask Redis: "Does this user have an active session?"**
- `redis.get(...)` — Redis GET command: retrieve a value by key
- `decoded.id` — the user ID we just extracted from the JWT
- Returns the stored token string, or `null` if:
  - User logged out (key was DEL'd)
  - Session expired (TTL ran out)
  - User never logged in through our system

```js
if (!storedToken) {
  return res.status(401).json({ error: 'Session expired or logged out' });
}
```
If Redis returns `null`, the session is gone. Reject with 401.

```js
if (storedToken !== token) {
  return res.status(401).json({ error: 'Session invalidated (logged in elsewhere)' });
}
```
**Bonus check:** Compare the stored token to the one being used.
Why? If the user logs in on a second device, a NEW token gets stored in Redis,
overwriting the old one. The old token's JWT signature is still valid, but it no
longer matches what's in Redis → old device gets kicked out.
This gives you "single session" behavior for free.

Only after BOTH checks pass do we forward the user info to downstream services.

## Verification

After implementing, test this flow:

```bash
# 1. Register a user (if you don't have one)
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test User"}'

# 2. Login — should get a token AND store session in Redis
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# 3. Access profile — should work (session exists in Redis)
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 4. Logout — should delete session from Redis
curl -X POST http://localhost:3000/api/users/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 5. Try profile again — should get 401 (session deleted!)
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

You can also verify directly in Redis:
```bash
docker exec -it redis_cache redis-cli
> KEYS session:*        # See all sessions
> GET session:{userId}  # Check a specific session
> TTL session:{userId}  # Check remaining time-to-live
```

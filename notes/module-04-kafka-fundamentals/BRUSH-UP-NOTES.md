# Brush-Up Notes — Everything We Built (Modules 0-4)

> Quick refresher after a break. Covers what we did, where the files are, and what changed at each stage.

---

## Project at a Glance

```
uber-web-clone/
├── docker-compose.yml            ← PostgreSQL, Redis, Kafka, Zookeeper
├── start-services.sh             ← Starts all 5 Node services
├── stop-services.sh              ← Stops them
├── SESSION_NOTES.md              ← Progress tracker (read every session)
├── SYLLABUS.md                   ← Full course plan
├── notes/                        ← Learning notes per task
└── services/
    ├── api-gateway/     (port 3000)  ← Single entry point, proxies to all services
    ├── user-service/    (port 3001)  ← Auth, profiles, sessions
    ├── ride-service/    (port 3002)  ← Will handle rides (currently minimal)
    ├── location-service/(port 3003)  ← Will handle GPS (currently minimal)
    └── notification-service/ (port 3004) ← Will consume Kafka events (currently minimal)
```

**Infrastructure (Docker Compose):**
- PostgreSQL 15 on port 5432 (user/password, db: microservices_db)
- Redis 7 on port 6379
- Kafka (Confluent 7.5.0) on port 9092 (internal: 29092)
- Zookeeper on port 2181

---

## Module 0 — Environment & Foundations

**What we did:** Set up Docker, project structure, Express servers, PostgreSQL connection.

### Key Files Changed

| File | What it does |
|------|-------------|
| `docker-compose.yml` | Defines all 4 infrastructure containers |
| `services/*/index.js` | Each service's entry point with Express 5 + `GET /health` |
| `services/*/package.json` | `"type": "module"` for ES imports, `"dev": "node --watch index.js"` |
| `services/user-service/src/db.js` | PostgreSQL connection pool using `pg` + exported `query()` helper |

### Concepts Learned
- Docker Compose orchestrates multiple containers
- Monorepo structure — each service is independent with its own `package.json`
- Health check pattern — every service exposes `GET /health`
- Connection pooling — `pg.Pool` reuses DB connections instead of opening new ones
- ES modules — `import/export` instead of `require()`

---

## Module 1 — User Service & Authentication

**What we did:** Built registration, login with JWT, auth middleware, driver profiles.

### Key Files Changed

| File | What it does |
|------|-------------|
| `services/user-service/src/routes/auth.js` | All user endpoints (register, login, logout, profile, driver-profile) |
| `services/user-service/src/middleware/auth.js` | JWT verification middleware (supports gateway headers OR direct JWT) |
| `services/user-service/src/middleware/authorize.js` | Role-based access control (`authorize('driver')`) |
| `services/user-service/src/db.js` | `query()` helper wrapping `pool.query()` |

### Database Schema (users table)
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(10) CHECK (role IN ('rider', 'driver')) DEFAULT 'rider',
  license_number VARCHAR(50),         -- driver only
  vehicle_info JSONB,                  -- driver only (make, model, color, plate)
  is_available BOOLEAN DEFAULT false,  -- driver only
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints Built
| Method | Endpoint | Auth? | What it does |
|--------|----------|-------|-------------|
| POST | `/api/users/register` | No | Create account (bcrypt hashes password) |
| POST | `/api/users/login` | No | Returns JWT token (24h expiry) |
| POST | `/api/users/logout` | Yes | Deletes Redis session |
| GET | `/api/users/profile` | Yes | Returns user profile (cached in Redis) |
| PUT | `/api/users/driver-profile` | Yes (driver) | Update license, vehicle, availability |
| PUT | `/api/users/driver-status` | Yes (driver) | Toggle online/offline + Redis Pub/Sub |

### How Auth Works (the flow)
```
1. User registers → password hashed with bcrypt → stored in PostgreSQL
2. User logs in   → bcrypt.compare() → JWT signed with secret → token returned
3. JWT contains:  { id, email, role, iat, exp }
4. Protected routes: auth middleware decodes JWT → sets req.user
```

---

## Module 2 — API Gateway Pattern

**What we did:** Built a reverse proxy gateway with edge auth and Redis rate limiting.

### Key Files Changed

| File | What it does |
|------|-------------|
| `services/api-gateway/index.js` | Express server with proxy routes + gateway auth middleware |
| `services/api-gateway/src/redis.js` | ioredis client for the gateway |
| `services/api-gateway/src/rateLimiter.js` | Redis-backed rate limiter (100 req/60s per IP) |
| `services/user-service/src/middleware/auth.js` | *Updated* — now accepts `X-User-*` headers from gateway |

### How the Gateway Works
```
Client Request
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ API GATEWAY (port 3000)                             │
│                                                     │
│  1. Rate Limiter  →  Redis INCR rate:{ip}           │
│     (100 req/min, fail-open if Redis down)          │
│                                                     │
│  2. Auth Middleware                                 │
│     - Skip for public routes (/register, /login)    │
│     - Verify JWT signature                          │
│     - Check Redis session exists (session:{userId}) │
│     - Check token matches (single-session enforce)  │
│     - Strip fake X-User-* headers (anti-spoofing)   │
│     - Add real X-User-Id/Email/Role headers         │
│                                                     │
│  3. Proxy via http-proxy-middleware                 │
│     /api/users/*     → localhost:3001               │
│     /api/rides/*     → localhost:3002               │
│     /api/locations/* → localhost:3003               │
└─────────────────────────────────────────────────────┘
```

### Rate Limiter Logic (rateLimiter.js)
```
For each request:
  1. INCR rate:{ip}       → atomic counter in Redis
  2. If count == 1        → EXPIRE key in 60 seconds (start window)
  3. If count > 100       → respond 429 Too Many Requests + Retry-After header
  4. If Redis is down     → fail open (let request through)
```

---

## Module 3 — Redis Deep Dive

**What we did:** Session management, profile caching (cache-aside), and Pub/Sub between services.

### Key Files Changed

| File | What it does |
|------|-------------|
| `services/user-service/src/redis.js` | ioredis client for user-service |
| `services/user-service/src/routes/auth.js` | *Updated* — login stores session in Redis, logout deletes it, profile reads from cache |
| `services/ride-service/src/redis.js` | ioredis with TWO connections (normal + subscriber) |
| `services/ride-service/index.js` | *Updated* — subscribes to `driver-status-changed` channel |
| `services/location-service/src/redis.js` | Same pattern — two connections |
| `services/location-service/index.js` | *Updated* — subscribes to `driver-status-changed` channel |

### Redis Usage Summary (4 patterns so far)

| Pattern | Redis Commands | Where |
|---------|---------------|-------|
| **Rate Limiting** | `INCR`, `EXPIRE`, `TTL` | api-gateway/src/rateLimiter.js |
| **Session Store** | `SET ... EX`, `GET`, `DEL` | user-service (login/logout) + api-gateway (check) |
| **Profile Cache** | `GET`, `SET ... EX 300`, `DEL` | user-service/src/routes/auth.js (profile + driver-profile) |
| **Pub/Sub** | `PUBLISH`, `SUBSCRIBE` | user-service publishes, ride-service + location-service subscribe |

### Cache-Aside Pattern (GET /profile)
```
Request comes in
     │
     ▼
Check Redis: GET user:{id}
     │
     ├── Cache HIT  → return cached data (skip DB entirely)
     │
     └── Cache MISS → query PostgreSQL
                      → store result: SET user:{id} {json} EX 300
                      → return fresh data

On WRITE (PUT /driver-profile):
     → Update PostgreSQL
     → DEL user:{id}   ← invalidate cache (next read fetches fresh)
```

### Pub/Sub Flow (driver-status toggle)
```
Driver calls PUT /api/users/driver-status { is_available: true }
     │
     ▼
user-service:
  1. UPDATE users SET is_available = true (PostgreSQL)
  2. DEL user:{id} (invalidate cache)
  3. PUBLISH "driver-status-changed" { driverId, available, timestamp }
     │
     ├──→ ride-service (subscriber): "Driver X is now ONLINE — add to matching pool"
     └──→ location-service (subscriber): "Driver X is now ONLINE — start tracking"
```

**Important:** A Redis connection in subscriber mode can ONLY listen — it can't run normal commands. That's why ride-service and location-service each create TWO ioredis connections: one normal (`redis`) and one dedicated subscriber (`subscriber`).

---

## Module 4 — Kafka Fundamentals (IN PROGRESS)

**What we did so far:** Task 4.1 only — verified Kafka is running and created topics via CLI.

### Task 4.1 — Kafka Setup Verification (DONE)

No code files changed. This was CLI-only work inside the Kafka Docker container.

**Topics created:**
| Topic | Partitions | Purpose |
|-------|-----------|---------|
| `ride-events` | 3 | High volume — ride lifecycle events (keyed by rideId) |
| `location-updates` | 3 | Highest volume — GPS updates every few seconds |
| `notifications` | 1 | Lower volume — ordering matters across all notifications |

**Key Kafka vs Redis Pub/Sub distinction:**
| | Redis Pub/Sub | Kafka |
|---|---|---|
| Storage | None (fire-and-forget) | Persisted to disk |
| Offline consumer | Misses messages | Catches up from last offset |
| Replay | Impossible | Can re-read from any offset |
| Best for | Real-time, ephemeral events | Reliable event processing, audit trails |

### Task 4.2 — Next Up
- Install `kafkajs` in ride-service
- Create a Kafka producer that sends test messages to `ride-events`
- Learn message structure: `{ key, value, headers }`
- Observe how different keys route to different partitions

---

## Quick Reference — How to Run Everything

```bash
# 1. Start infrastructure (Docker)
#    NOTE: Stop local PostgreSQL first if running
sudo systemctl stop postgresql
docker compose up -d

# 2. Start all 5 services
./start-services.sh
# Or manually:
#   cd services/api-gateway && npm run dev
#   cd services/user-service && npm run dev
#   ... etc

# 3. Test
curl http://localhost:3000/health          # gateway
curl http://localhost:3001/health          # user-service (direct)
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","name":"Test"}'
```

---

## File Tree — What Exists Right Now

```
services/
├── api-gateway/
│   ├── index.js                    ← Express + proxy + auth + rate limiting
│   ├── package.json
│   └── src/
│       ├── rateLimiter.js          ← Redis INCR rate limiting
│       └── redis.js                ← ioredis client
│
├── user-service/
│   ├── index.js                    ← Express + routes + DB health check
│   ├── package.json
│   └── src/
│       ├── db.js                   ← pg Pool + query() helper
│       ├── redis.js                ← ioredis client
│       ├── routes/
│       │   └── auth.js             ← register, login, logout, profile, driver-profile, driver-status
│       └── middleware/
│           ├── auth.js             ← JWT verify OR gateway header trust
│           └── authorize.js        ← Role check (e.g., driver-only)
│
├── ride-service/
│   ├── index.js                    ← Express + Redis Pub/Sub subscriber
│   ├── package.json
│   └── src/
│       └── redis.js                ← Two connections (normal + subscriber)
│
├── location-service/
│   ├── index.js                    ← Express + Redis Pub/Sub subscriber
│   ├── package.json
│   └── src/
│       └── redis.js                ← Two connections (normal + subscriber)
│
└── notification-service/
    ├── index.js                    ← Express (bare — no real logic yet)
    └── package.json
```

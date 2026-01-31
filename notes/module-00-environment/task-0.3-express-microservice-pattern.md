# Task 0.3 — Basic Express Microservice Pattern

## What You'll Learn
- What a microservice actually IS (and what it isn't)
- How microservices differ from a monolith
- The health check pattern — why every service needs one
- How to verify services work independently

---

## Concept: Monolith vs Microservices

### The Monolith (Traditional Approach)
Imagine you're building Uber as ONE big application:

```
┌──────────────────────────────────────────┐
│              UBER MONOLITH               │
│                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │   Auth   │ │  Rides   │ │ Location │ │
│  │  Code    │ │  Code    │ │  Code    │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐              │
│  │ Payments │ │  Notif.  │  ALL in ONE  │
│  │  Code    │ │  Code    │  process!    │
│  └──────────┘ └──────────┘              │
│                                          │
│          ONE database connection         │
│          ONE server, ONE port            │
│          ONE deployment                  │
└──────────────────────────────────────────┘
```

**Problems with monoliths at scale:**
- Change one thing → deploy EVERYTHING
- Bug in payments → crashes the WHOLE app
- Can't scale just the busy parts (location gets 100x more traffic than auth)
- One team's code change can break another team's feature
- Growing codebase becomes harder and harder to understand

### Microservices (What We're Building)
Each piece of functionality is its own **independent application**:

```
┌────────────┐  ┌────────────┐  ┌────────────┐
│   User     │  │   Ride     │  │  Location  │
│  Service   │  │  Service   │  │  Service   │
│            │  │            │  │            │
│ Port 3001  │  │ Port 3002  │  │ Port 3003  │
│ Own code   │  │ Own code   │  │ Own code   │
│ Own deps   │  │ Own deps   │  │ Own deps   │
└────────────┘  └────────────┘  └────────────┘
      │               │               │
  Separate        Separate        Separate
  process         process         process
```

**Key properties of a microservice:**
1. **Runs independently** — each service is its own Node.js process
2. **Has its own port** — different address on the network
3. **Single responsibility** — does ONE thing well
4. **Can be deployed alone** — update user-service without touching ride-service
5. **Can fail alone** — if location-service crashes, users can still log in
6. **Can scale alone** — need more location capacity? Run 5 copies of just that service

### Real-World Analogy
Think of a restaurant:
- **Monolith** = One person does everything (takes orders, cooks, serves, handles payments)
- **Microservices** = Specialized roles (waiter, chef, cashier) — each does their job independently

If the chef is slow, you hire ANOTHER chef. You don't need to duplicate the waiter too.

---

## Concept: Health Check Endpoints

### What is a Health Check?
A health check is a simple endpoint that answers: **"Are you alive and working?"**

```
GET /health  →  { "status": "ok", "service": "user-service", "uptime": 125.4 }
```

### Why Do We Need Health Checks?

In a microservices system, you need to know if services are up or down:

```
API Gateway: "Let me check who's alive..."

  GET :3001/health → 200 OK  ✓ user-service is UP
  GET :3002/health → 200 OK  ✓ ride-service is UP
  GET :3003/health → TIMEOUT  ✗ location-service is DOWN!
  GET :3004/health → 200 OK  ✓ notification-service is UP
```

**Who uses health checks?**
- **Docker** — restarts containers that fail health checks
- **Load balancers** — stops sending traffic to unhealthy instances
- **Monitoring tools** — alerts engineers when a service is down
- **Other services** — know if a dependency is available

### What to Include in a Health Check Response
- `status` — "ok" or "error"
- `service` — which service this is
- `uptime` — how long the service has been running (in seconds)
- Later we'll add: database connection status, Redis status, etc.

---

## Concept: Port Allocation

Each microservice listens on a different port so they don't conflict:

```
Your Computer (localhost)
┌─────────────────────────────────────────────┐
│                                             │
│  :3000 ── API Gateway (the front door)      │
│  :3001 ── User Service                      │
│  :3002 ── Ride Service                      │
│  :3003 ── Location Service                  │
│  :3004 ── Notification Service              │
│                                             │
│  :5432 ── PostgreSQL (database)             │
│  :6379 ── Redis (cache)                     │
│  :9092 ── Kafka (message broker)            │
│                                             │
└─────────────────────────────────────────────┘
```

Think of ports like apartment numbers in a building.
The building is `localhost`, and each service lives at a different apartment number.

---

## Your Exercise

### What you need to do:

1. **Add a `GET /health` endpoint** to each of the 5 services (api-gateway, user-service, ride-service, location-service, notification-service)

   The health endpoint should return JSON with:
   - `status`: `"ok"`
   - `service`: the service name (e.g., `"user-service"`)
   - `uptime`: how many seconds the process has been running

   **Hint:** Node.js has a built-in `process.uptime()` function that returns uptime in seconds.

2. **Test each service** by:
   - Starting the service with `npm start` (from its directory)
   - Visiting `http://localhost:<PORT>/health` in your browser or using `curl`
   - Verifying you get the correct JSON response

### Expected responses:

```
GET http://localhost:3000/health
→ { "status": "ok", "service": "api-gateway", "uptime": 12.345 }

GET http://localhost:3001/health
→ { "status": "ok", "service": "user-service", "uptime": 8.123 }

... and so on for each service
```

### Try it yourself first!
Open each service's `index.js` and add the health endpoint. The code is very similar to the existing `GET /` route — you just need to:
1. Change the path from `'/'` to `'/health'`
2. Add `uptime` using `process.uptime()`

Once you've tried (or if you get stuck), let me know and we'll review together!

---

## Verification Checklist
- [ ] Each service has a `GET /health` endpoint
- [ ] Health response includes `status`, `service`, and `uptime`
- [ ] Each service runs independently on its own port
- [ ] All 5 services can run at the same time without port conflicts

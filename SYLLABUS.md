# UBER WEB CLONE — Complete Learning Syllabus

> A project-based course to learn Kafka, Redis, and System Design
> by building an Uber clone with Node.js microservices.

---

## Architecture Overview (What We're Building)

```
                        ┌─────────────┐
                        │   React UI  │
                        │  (Rider &   │
                        │   Driver)   │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │ API Gateway │  ← Single entry point
                        │  (Express)  │
                        └──────┬──────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
   ┌──────▼──────┐     ┌──────▼──────┐      ┌──────▼──────┐
   │    User      │     │   Ride      │      │  Location   │
   │   Service    │     │  Service    │      │  Service    │
   │  (Auth,      │     │ (Matching,  │      │ (GPS,       │
   │  Profiles)   │     │  Pricing,   │      │  Tracking)  │
   └──────┬──────┘     │  Status)    │      └──────┬──────┘
          │             └──────┬──────┘             │
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐     ┌─────────────┐      ┌─────────────┐
   │ PostgreSQL  │     │   Kafka     │      │   Redis     │
   │ (Users DB)  │     │  (Events)   │      │ (GeoData,   │
   │             │     │             │      │  Cache)     │
   └─────────────┘     └─────────────┘      └─────────────┘
                               │
                        ┌──────▼──────┐
                        │ Notification│
                        │  Service    │
                        │ (Consumer)  │
                        └─────────────┘
```

### Microservices We'll Build:
1. **API Gateway** — Routes requests, rate limiting, auth verification
2. **User Service** — Registration, login, JWT auth, profiles (rider/driver)
3. **Ride Service** — Ride requests, matching, pricing, ride lifecycle
4. **Location Service** — Real-time driver tracking, geospatial queries
5. **Notification Service** — Kafka consumer, sends ride updates (simulated)

---

## MODULE 0: Environment & Foundations
**Goal:** Get everything running, understand the project structure

### Task 0.1 — Docker Compose Setup ✅
- [x] Create `docker-compose.yml` with: PostgreSQL, Kafka (+ Zookeeper), Redis
- [x] Verify all containers start and are accessible
- **Learn:** What Docker Compose does, why microservices need it
- **Concept:** Container orchestration basics

### Task 0.2 — Project Structure ✅
- [x] Create the monorepo folder structure:
  ```
  uber-web-clone/
  ├── docker-compose.yml
  ├── services/
  │   ├── api-gateway/
  │   ├── user-service/
  │   ├── ride-service/
  │   ├── location-service/
  │   └── notification-service/
  ├── frontend/
  ├── shared/          (shared utilities, constants)
  ├── SESSION_NOTES.md
  └── SYLLABUS.md
  ```
- [x] Initialize each service with `package.json` and basic Express server
- **Learn:** Monorepo structure, why each service is independent

### Task 0.3 — Basic Express Microservice Pattern ✅
- [x] Create a reusable Express server template
- [x] Add health check endpoint (`GET /health`) to each service
- [x] Test that all services run independently on different ports
- **Learn:** What a microservice IS, how it differs from monolith
- **Concept:** Service independence, port allocation

### Task 0.4 — Connect to PostgreSQL from User Service ✅
- [x] Install `pg` (node-postgres) in user-service
- [x] Create a database connection utility
- [x] Test the connection with a simple query
- **Learn:** Connection pooling, environment variables, why not one DB per service (yet)

---

## MODULE 1: User Service & Authentication
**Goal:** Build user registration/login, learn JWT, understand service boundaries

### Concepts to Learn First:
- What is a microservice boundary?
- JWT tokens — how they work, why stateless auth matters
- Password hashing with bcrypt
- REST API design basics

### Task 1.1 — Database Schema Design ✅
- [x] Design `users` table (id, email, password_hash, name, role, created_at)
- [x] Write and run the SQL migration manually (learn before using ORMs)
- [x] Understand primary keys, indexes, and why email should be unique
- **Exercise:** Draw the table schema on paper first, then implement

### Task 1.2 — User Registration Endpoint
- [ ] `POST /api/users/register` — accepts email, password, name, role (rider/driver)
- [ ] Validate input (no empty fields, valid email format)
- [ ] Hash password with bcrypt before storing
- [ ] Return user object (without password)
- **Exercise:** Try writing this yourself first, then we review together

### Task 1.3 — User Login & JWT
- [ ] `POST /api/users/login` — accepts email, password
- [ ] Compare password with bcrypt
- [ ] Generate JWT token with user id and role
- [ ] Return token to client
- **Learn:** JWT structure (header.payload.signature), expiry, secrets
- **Exercise:** Decode a JWT on jwt.io to understand the structure

### Task 1.4 — Auth Middleware
- [ ] Create middleware that verifies JWT from `Authorization` header
- [ ] Attach decoded user info to `req.user`
- [ ] Create a protected route `GET /api/users/profile`
- **Learn:** Middleware pattern, request pipeline

### Task 1.5 — Driver-Specific Fields
- [ ] Add `vehicle_info` (JSON), `is_available` (boolean), `license_number` to users table
- [ ] `PUT /api/users/driver-profile` — update driver details
- [ ] Only allow users with role=driver to access this

---

## MODULE 2: API Gateway Pattern
**Goal:** Understand why API gateways exist, implement request routing

### Concepts to Learn First:
- What problem does an API Gateway solve?
- Reverse proxy pattern
- Why not let the frontend talk to each service directly?

### Task 2.1 — Basic API Gateway
- [ ] Set up Express server that proxies requests to backend services
- [ ] Route `/api/users/*` → User Service
- [ ] Route `/api/rides/*` → Ride Service
- [ ] Route `/api/locations/*` → Location Service
- **Learn:** `http-proxy-middleware` package, URL rewriting

### Task 2.2 — Auth at the Gateway
- [ ] Move JWT verification to the API Gateway
- [ ] Forward decoded user info to downstream services via headers
- [ ] Services trust the gateway (internal network concept)
- **Learn:** Edge authentication vs service-level authentication

### Task 2.3 — Rate Limiting with Redis (First Redis Usage!)
- [ ] Install Redis client (`ioredis`) in api-gateway
- [ ] Implement rate limiting: max 100 requests per minute per IP
- [ ] Store request counts in Redis with TTL (time-to-live)
- **Learn:** Redis as a fast key-value store, TTL, atomic operations
- **Exercise:** What happens if Redis goes down? How should the gateway behave?

```
REDIS CONCEPT — Rate Limiting:
┌──────────────────────────────┐
│ Key: "rate:192.168.1.1"      │
│ Value: 47                    │
│ TTL: 38 seconds remaining    │
│                              │
│ Each request: INCR key       │
│ If value > 100: reject (429) │
│ Key auto-expires after 60s   │
└──────────────────────────────┘
```

---

## MODULE 3: Redis Deep Dive — Caching & Sessions
**Goal:** Understand Redis data structures, caching strategies, session management

### Concepts to Learn First:
- Redis data types: Strings, Hashes, Lists, Sets, Sorted Sets, Geo
- Cache-aside pattern (lazy loading)
- Cache invalidation (the hard problem)
- TTL-based expiry

### Task 3.1 — Session Management with Redis
- [ ] Store active JWT sessions in Redis (key: userId, value: token)
- [ ] Implement logout by deleting session from Redis
- [ ] Check Redis on each request (gateway) — enables token revocation
- **Learn:** Why JWT alone can't do logout (stateless problem)
- **Concept:** Redis as a session store

```
SESSION FLOW:
Login → Generate JWT → Store in Redis (SET session:{userId} {token} EX 86400)
Request → Verify JWT → Check Redis (EXISTS session:{userId})
Logout → Delete from Redis (DEL session:{userId})
```

### Task 3.2 — User Profile Caching
- [ ] Cache user profile in Redis after first DB fetch
- [ ] On profile update, invalidate the cache
- [ ] Set TTL of 5 minutes on cached profiles
- **Learn:** Cache-aside pattern, cache invalidation
- **Exercise:** Draw the flow diagram — what happens on cache HIT vs MISS?

### Task 3.3 — Redis Pub/Sub (Preview of Real-time)
- [ ] Implement a simple pub/sub between two services
- [ ] Publish "driver-status-changed" events
- [ ] Subscribe and log events in another service
- **Learn:** Redis Pub/Sub vs Kafka (when to use which)
- **Concept:** Fire-and-forget vs guaranteed delivery

---

## MODULE 4: Kafka Fundamentals — Event-Driven Architecture
**Goal:** Understand Kafka core concepts, set up producers and consumers

### Concepts to Learn First (CRITICAL MODULE):
- What is event-driven architecture and why?
- Kafka vs traditional message queues (RabbitMQ)
- Topics, Partitions, Offsets, Consumer Groups
- Producers and Consumers
- Why Kafka for Uber? (millions of location updates/sec)

```
KAFKA CONCEPTS:

Topic: "ride-events"
┌─────────────────────────────────────────────┐
│ Partition 0: [msg1] [msg4] [msg7] [msg10]   │
│ Partition 1: [msg2] [msg5] [msg8] [msg11]   │
│ Partition 2: [msg3] [msg6] [msg9] [msg12]   │
└─────────────────────────────────────────────┘

Consumer Group: "ride-service-group"
  Consumer A → reads Partition 0
  Consumer B → reads Partition 1
  Consumer C → reads Partition 2
  (parallel processing!)

Key Insight: Messages with same KEY always go to same partition
  → All events for ride-123 go to same partition
  → Guarantees ordering per ride!
```

### Task 4.1 — Kafka Setup Verification
- [ ] Verify Kafka is running in Docker
- [ ] Use `kafka-topics.sh` to create topics manually from inside container
- [ ] Create topics: `ride-events`, `location-updates`, `notifications`
- [ ] List topics, describe topic details (partitions, replication)
- **Learn:** Kafka CLI tools, topic configuration

### Task 4.2 — Your First Kafka Producer
- [ ] Install `kafkajs` in ride-service
- [ ] Create a producer that sends a test message to `ride-events`
- [ ] Understand message structure: { key, value, headers }
- [ ] Send 10 messages and observe in Kafka
- **Exercise:** Send messages with different keys — observe partition assignment

### Task 4.3 — Your First Kafka Consumer
- [ ] Create a consumer in notification-service
- [ ] Subscribe to `ride-events` topic
- [ ] Process and log each message
- [ ] Understand consumer groups and offsets
- **Exercise:** Run two consumers in same group — watch load balancing
- **Exercise:** Run two consumers in different groups — watch fan-out

### Task 4.4 — Kafka Utility Module (Shared)
- [ ] Create `shared/kafka.js` — reusable producer/consumer factory
- [ ] Configuration: brokers, client ID, retry settings
- [ ] Graceful shutdown handling (disconnect on SIGTERM)
- **Learn:** Why graceful shutdown matters (uncommitted offsets)

---

## MODULE 5: Ride Service — The Core Business Logic
**Goal:** Build the ride lifecycle, use Kafka for event communication

### Concepts to Learn First:
- State machine pattern (ride states)
- Event sourcing basics
- Distributed transactions (why they're hard)

```
RIDE STATE MACHINE:

  REQUESTED → ACCEPTED → DRIVER_EN_ROUTE → DRIVER_ARRIVED
                                                  │
                                           RIDE_IN_PROGRESS
                                                  │
                                             COMPLETED

  Any state → CANCELLED (by rider or driver)
```

### Task 5.1 — Rides Database Schema
- [ ] Design `rides` table:
  - id, rider_id, driver_id, status, pickup_lat, pickup_lng,
    dropoff_lat, dropoff_lng, fare, created_at, updated_at
- [ ] Write migration SQL
- **Exercise:** Think about indexes — which queries will be frequent?

### Task 5.2 — Request a Ride (Producer)
- [ ] `POST /api/rides/request` — rider submits pickup & dropoff location
- [ ] Save ride to DB with status=REQUESTED
- [ ] Publish event to Kafka: `ride-events` topic
  ```json
  {
    "eventType": "RIDE_REQUESTED",
    "rideId": "uuid",
    "riderId": "uuid",
    "pickup": { "lat": 40.7128, "lng": -74.0060 },
    "dropoff": { "lat": 40.7580, "lng": -73.9855 }
  }
  ```
- **Learn:** Event payload design, idempotency keys

### Task 5.3 — Driver Matching (Consumer + Redis Geo!)
- [ ] Consume `RIDE_REQUESTED` events in ride-service
- [ ] Use Redis GEOSEARCH to find nearby available drivers
- [ ] Select closest available driver
- [ ] Update ride with driver_id, status=ACCEPTED
- [ ] Publish `RIDE_ACCEPTED` event to Kafka
- **Learn:** Redis GEO commands (GEOADD, GEOSEARCH, GEODIST)

```
REDIS GEO — Driver Locations:
┌──────────────────────────────────────┐
│ Key: "driver-locations"              │
│ GEOADD driver-locations              │
│   -74.006 40.7128 "driver-uuid-1"   │
│   -73.985 40.758  "driver-uuid-2"   │
│                                      │
│ GEOSEARCH driver-locations           │
│   FROMLONLAT -74.006 40.7128        │
│   BYRADIUS 5 km ASC COUNT 10        │
│ → Returns nearest 10 drivers!       │
└──────────────────────────────────────┘
```

### Task 5.4 — Ride Status Updates
- [ ] `PUT /api/rides/:id/status` — driver updates ride status
- [ ] Validate state transitions (can't go from REQUESTED to COMPLETED)
- [ ] Publish status change event to Kafka
- [ ] Each status change = new Kafka event
- **Learn:** State machine validation, audit trail through events

### Task 5.5 — Fare Calculation
- [ ] Calculate fare based on distance (Haversine formula)
- [ ] Base fare + per-km rate + time component (simulated)
- [ ] Store fare in ride record
- **Learn:** Haversine formula for lat/lng distance, pricing models

---

## MODULE 6: Location Service — Real-Time Tracking with Redis
**Goal:** Handle real-time driver location updates, learn Redis Geo and Kafka streaming

### Concepts to Learn First:
- Geospatial indexing (how Uber tracks millions of drivers)
- High-throughput event streaming
- WebSocket basics for real-time UI updates

### Task 6.1 — Driver Location Updates (Kafka Producer)
- [ ] `POST /api/locations/update` — driver sends current lat/lng
- [ ] Store in Redis GEO set (real-time, fast lookups)
- [ ] Publish to Kafka `location-updates` topic (for analytics/history)
- **Learn:** Why Redis for real-time + Kafka for persistence

```
DUAL WRITE PATTERN:
Driver sends location
  ├→ Redis GEOADD (for real-time queries)  ← FAST
  └→ Kafka produce (for history/analytics) ← DURABLE
```

### Task 6.2 — Find Nearby Drivers Endpoint
- [ ] `GET /api/locations/nearby?lat=X&lng=Y&radius=5`
- [ ] Use Redis GEOSEARCH to find drivers within radius
- [ ] Return list with distances
- **Exercise:** Experiment with different radius values, see how it affects results

### Task 6.3 — Real-Time Tracking with WebSocket
- [ ] Add Socket.IO to location-service and api-gateway
- [ ] When a ride is active, stream driver location to rider
- [ ] Use Redis Pub/Sub to bridge between services
- **Learn:** WebSocket vs HTTP polling, Socket.IO rooms

```
REAL-TIME FLOW:
Driver App → POST /locations/update → Redis GEO + Redis PUB
                                              │
Rider App ← WebSocket ← API Gateway ← Redis SUB
```

### Task 6.4 — Location History (Kafka Consumer)
- [ ] Consume `location-updates` in a new consumer
- [ ] Store location history in PostgreSQL (for ride route replay)
- [ ] Batch inserts for efficiency
- **Learn:** Kafka consumer lag, batch processing, back-pressure

---

## MODULE 7: Notification Service — Kafka Consumer Patterns
**Goal:** Build a pure Kafka consumer service, learn advanced consumer patterns

### Concepts to Learn First:
- Consumer group rebalancing
- Dead letter queues (DLQ)
- Retry strategies
- Idempotent processing

### Task 7.1 — Notification Consumer
- [ ] Consume ALL `ride-events` in notification-service
- [ ] Route to different handlers based on eventType:
  - RIDE_REQUESTED → notify nearby drivers
  - RIDE_ACCEPTED → notify rider "driver is on the way"
  - RIDE_COMPLETED → notify both with fare summary
- [ ] Log notifications (simulated — console + stored in DB)
- **Learn:** Event routing, handler pattern

### Task 7.2 — Dead Letter Queue
- [ ] When a notification fails to process, send to `notifications-dlq` topic
- [ ] Include error details and original message
- [ ] Build a simple DLQ viewer endpoint
- **Learn:** Why DLQs exist, retry vs DLQ decision

```
DLQ FLOW:
ride-events → Consumer → Process → Success ✓
                  │
                  └→ Fail (3 retries)
                       │
                       └→ notifications-dlq topic
                            │
                            └→ Manual review / reprocess
```

### Task 7.3 — Retry Logic with Exponential Backoff
- [ ] Implement retry with delays: 1s, 2s, 4s (then DLQ)
- [ ] Track retry count in message headers
- **Learn:** Exponential backoff, jitter, circuit breaker concept

### Task 7.4 — Idempotent Processing
- [ ] Use Redis to track processed event IDs
- [ ] Before processing, check if already handled
- [ ] Prevent duplicate notifications on reprocessing
- **Learn:** Exactly-once vs at-least-once semantics, idempotency keys

---

## MODULE 8: Frontend — React Dashboard
**Goal:** Build rider and driver UIs, integrate with all backend services

### Task 8.1 — Project Setup
- [ ] Create React app with Vite
- [ ] Set up React Router (rider view, driver view, login/register)
- [ ] Basic layout with Tailwind CSS

### Task 8.2 — Authentication UI
- [ ] Login and Register pages
- [ ] Store JWT in memory (not localStorage — learn why)
- [ ] Auth context/provider
- [ ] Protected routes

### Task 8.3 — Rider Dashboard
- [ ] Map component using Leaflet.js + OpenStreetMap (free, no API key!)
- [ ] Click on map to set pickup/dropoff
- [ ] Request ride button → calls API
- [ ] Show ride status updates (polling → then upgrade to WebSocket)
- [ ] Show driver location on map during ride

### Task 8.4 — Driver Dashboard
- [ ] Toggle availability (online/offline)
- [ ] Simulate location updates (send coordinates every 3s)
- [ ] Receive ride requests
- [ ] Accept/reject rides
- [ ] Update ride status (arrived, started, completed)

### Task 8.5 — Real-Time Map Updates
- [ ] Connect to WebSocket for live driver tracking
- [ ] Animate driver marker movement on map
- [ ] Show ETA (estimated, based on distance)

---

## MODULE 9: System Design Concepts (Theory + Practice)
**Goal:** Apply system design thinking to what we've built

### Task 9.1 — Draw the System Design Diagram
- [ ] Create a complete architecture diagram of our system
- [ ] Identify every communication path (sync HTTP, async Kafka, real-time WS)
- [ ] Label what Redis is used for at each point
- **Exercise:** Present this as if in a system design interview

### Task 9.2 — Scaling Discussion
- [ ] What happens if 1 million riders request rides simultaneously?
- [ ] How would you scale each service? (horizontal scaling)
- [ ] Kafka partitions — how do they help with parallelism?
- [ ] Redis cluster — when do you need it?
- [ ] Database sharding — when and how?

### Task 9.3 — Failure Scenarios
- [ ] What if Kafka goes down? (circuit breaker, fallback)
- [ ] What if Redis goes down? (graceful degradation)
- [ ] What if a service crashes mid-ride? (recovery from Kafka events)
- [ ] Network partition between services?
- **Exercise:** For each scenario, write a short doc on what happens and how to handle it

### Task 9.4 — Add Health Checks & Monitoring
- [ ] Health endpoints that check DB, Redis, and Kafka connectivity
- [ ] Simple monitoring dashboard (service status page)
- **Learn:** Liveness vs readiness probes, circuit breaker pattern

---

## MODULE 10: Advanced Topics & Polish
**Goal:** Level up with advanced patterns

### Task 10.1 — Kafka Event Sourcing
- [ ] Reconstruct a ride's full history from Kafka events alone
- [ ] Implement a "replay" endpoint that rebuilds ride state from events
- **Learn:** Event sourcing, CQRS pattern basics

### Task 10.2 — Redis Streams (Alternative to Pub/Sub)
- [ ] Replace Redis Pub/Sub with Redis Streams for location updates
- [ ] Consumer groups in Redis Streams
- **Learn:** Redis Streams vs Pub/Sub vs Kafka — trade-offs

### Task 10.3 — Surge Pricing with Redis
- [ ] Track ride requests per area using Redis
- [ ] If demand > threshold in a geo-cell, apply surge multiplier
- [ ] Use Redis Sorted Sets for leaderboard of busy areas
- **Learn:** Real-world pricing algorithms, sliding windows

### Task 10.4 — Integration Testing
- [ ] Write integration tests using docker-compose test environment
- [ ] Test the full ride flow end-to-end
- [ ] Test Kafka message flow between services

### Task 10.5 — Final System Design Document
- [ ] Write a complete system design document for our Uber clone
- [ ] Include: architecture, data models, API specs, message formats
- [ ] Discuss trade-offs, what we'd change for production scale
- **This is your portfolio piece!**

---

## QUICK REFERENCE — Technologies & Ports

| Service              | Port  | Tech Stack                     |
|----------------------|-------|--------------------------------|
| API Gateway          | 3000  | Express, http-proxy-middleware |
| User Service         | 3001  | Express, pg, bcrypt, JWT       |
| Ride Service         | 3002  | Express, pg, kafkajs, ioredis  |
| Location Service     | 3003  | Express, kafkajs, ioredis, WS  |
| Notification Service | 3004  | Express, kafkajs               |
| React Frontend       | 5173  | Vite, React, Leaflet           |
| PostgreSQL           | 5432  | —                              |
| Redis                | 6379  | —                              |
| Kafka                | 9092  | —                              |
| Zookeeper            | 2181  | —                              |

---

## LEARNING CHECKPOINTS

After each module, the student should be able to answer:

- **Module 0:** "What is Docker Compose and why do microservices need it?"
- **Module 1:** "How does JWT authentication work across services?"
- **Module 2:** "What problem does an API Gateway solve?"
- **Module 3:** "When should you use Redis vs a database?"
- **Module 4:** "What are Kafka topics, partitions, and consumer groups?"
- **Module 5:** "How does event-driven communication differ from REST?"
- **Module 6:** "How does Redis GEO enable real-time location queries?"
- **Module 7:** "What is a Dead Letter Queue and why do we need one?"
- **Module 8:** "How do WebSockets enable real-time UI updates?"
- **Module 9:** "How would you scale this system to handle 1M concurrent users?"
- **Module 10:** "What is event sourcing and when would you use it?"

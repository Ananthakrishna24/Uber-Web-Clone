# Task 3.3 — Redis Pub/Sub (Preview of Real-time)

## What You'll Learn
- What Redis Pub/Sub is and how it works
- The publish/subscribe messaging pattern
- Redis Pub/Sub vs Kafka — when to use which
- Fire-and-forget vs guaranteed delivery

---

## Concept: The Pub/Sub Pattern

Imagine a radio station. The station **publishes** (broadcasts) music on a frequency.
Listeners **subscribe** to that frequency and hear the music in real time.

- The station doesn't know or care who's listening
- If nobody is tuned in, the broadcast is lost — nobody hears it
- If you tune in late, you miss what was already played

This is **Pub/Sub** — a messaging pattern where senders (publishers) don't send
messages directly to specific receivers (subscribers). Instead, messages go to a
**channel**, and anyone subscribed to that channel gets the message.

```
PUBLISH/SUBSCRIBE PATTERN:

  Publisher                    Channel                    Subscribers
  ─────────                    ───────                    ───────────
                          ┌──────────────┐
  user-service  ────────► │  "driver-    │ ─────────►  ride-service
  (publishes)             │   status-    │ ─────────►  location-service
                          │   changed"   │ ─────────►  (any future service)
                          └──────────────┘

  Key point: Publisher doesn't know WHO is listening.
  Subscribers can come and go freely.
```

---

## How Redis Pub/Sub Works

Redis has built-in Pub/Sub with just two commands:

### PUBLISH — Send a message to a channel
```
PUBLISH "driver-status-changed" '{"driverId":"abc","available":true}'
```
Returns the number of subscribers who received the message.

### SUBSCRIBE — Listen to a channel
```
SUBSCRIBE "driver-status-changed"
```
This is a **blocking** operation — the connection stays open, waiting for messages.

### Important: Dedicated Connection

When a Redis client subscribes to a channel, that connection is now in
**subscriber mode**. It can ONLY:
- Subscribe to more channels
- Unsubscribe
- Receive messages

It CANNOT run normal Redis commands (GET, SET, etc.) anymore.
That's why you need **two separate Redis connections**:
1. One for normal commands (GET, SET, INCR, etc.)
2. One dedicated for subscribing

```
TWO CONNECTIONS:

  ┌─────────────────────────────┐
  │        Your Service         │
  │                             │
  │  redis (normal)  ─────────────► GET, SET, DEL, etc.
  │                             │
  │  redisSub (subscriber) ────────► SUBSCRIBE, listen for messages
  │                             │
  └─────────────────────────────┘
         Both connect to the same Redis server,
         but they are separate TCP connections.
```

---

## Redis Pub/Sub vs Kafka — The Critical Difference

This is the most important concept in this task:

```
┌────────────────────────────┬──────────────────────────────────┐
│       Redis Pub/Sub        │            Kafka                 │
├────────────────────────────┼──────────────────────────────────┤
│ Fire-and-forget            │ Guaranteed delivery              │
│ No message storage         │ Messages stored on disk          │
│ Miss it = it's gone        │ Can replay from any offset       │
│ No consumer groups         │ Consumer groups + load balancing │
│ No acknowledgment          │ Offset commits = acknowledgment  │
│ Very fast, very simple     │ More complex, more reliable      │
│ Best for: real-time events │ Best for: business events        │
│ that are OK to lose        │ that MUST be processed           │
├────────────────────────────┼──────────────────────────────────┤
│ EXAMPLE USE CASES:         │ EXAMPLE USE CASES:               │
│ - Live location updates    │ - Ride requested (MUST process)  │
│ - Driver went online/      │ - Payment events                 │
│   offline notifications    │ - Ride status changes            │
│ - UI refresh triggers      │ - Notifications to send          │
│ - Cache invalidation       │ - Audit trail / event history    │
│   across services          │                                  │
└────────────────────────────┴──────────────────────────────────┘
```

### When to use Redis Pub/Sub:
- Real-time "nice to know" events
- If a subscriber is down, it's OK to miss the message
- You need very low latency (sub-millisecond)
- Simple broadcast to multiple listeners

### When to use Kafka:
- Business-critical events (ride requests, payments)
- You need message replay (debugging, reprocessing)
- Consumer can be down temporarily and catch up later
- You need guaranteed ordering within a partition

### The Uber Analogy:
- **"Driver is now online"** → Redis Pub/Sub (nice to know, real-time)
- **"Ride #123 was requested"** → Kafka (MUST be processed, can't lose it)

---

## What We'll Build

We'll add a **driver availability toggle** to the user-service.
When a driver goes online or offline:

1. **user-service** updates the database (`is_available` field)
2. **user-service** publishes a message to Redis channel `driver-status-changed`
3. **ride-service** subscribes and logs the event (simulating "update matching pool")
4. **location-service** subscribes and logs the event (simulating "start/stop tracking")

```
FLOW:

  Driver toggles availability
         │
         ▼
  ┌──────────────┐    PUBLISH "driver-status-changed"
  │ user-service │ ──────────────────────────────────┐
  │  (updates DB │                                    │
  │   + publishes│                              ┌─────▼──────┐
  │   to Redis)  │                              │   Redis    │
  └──────────────┘                              │   Server   │
                                                └──┬──────┬──┘
                                                   │      │
                              SUBSCRIBE            │      │    SUBSCRIBE
                         ┌─────────────────────────┘      └──────────────────┐
                         │                                                    │
                  ┌──────▼──────┐                                     ┌──────▼──────┐
                  │ride-service │                                     │  location-  │
                  │ (logs: "add/│                                     │  service    │
                  │  remove from│                                     │ (logs:      │
                  │  matching   │                                     │  "start/stop│
                  │  pool")     │                                     │  tracking") │
                  └─────────────┘                                     └─────────────┘
```

---

## Exercise / Assignment

### Step 1: Install ioredis in ride-service and location-service
Both services need a Redis client to subscribe.

### Step 2: Create Redis connections
In both ride-service and location-service, create TWO Redis instances:
- `redis` — for normal commands (you'll use this later)
- `subscriber` — dedicated to subscribing

### Step 3: Add a driver availability endpoint
In user-service, create:
`PUT /api/users/driver-status` — toggles `is_available` for a driver
After updating the DB, PUBLISH an event to the `driver-status-changed` channel.

The event payload should be JSON:
```json
{
  "driverId": "uuid-here",
  "available": true,
  "timestamp": "2026-02-01T..."
}
```

### Step 4: Subscribe in ride-service and location-service
On startup, subscribe to `driver-status-changed` and log when events arrive.

### Verification
1. Start all services
2. Login as a driver
3. Hit the new endpoint to toggle availability
4. Check ride-service and location-service logs — you should see the event

---

## Key Terms
- **Channel** — A named message bus in Redis (like a radio frequency)
- **Publisher** — A client that sends messages to a channel
- **Subscriber** — A client that listens to a channel for messages
- **Fire-and-forget** — Send it and move on; no confirmation it was received
- **Guaranteed delivery** — The system ensures the message is processed (Kafka)
- **Subscriber mode** — A Redis connection locked into only receiving messages

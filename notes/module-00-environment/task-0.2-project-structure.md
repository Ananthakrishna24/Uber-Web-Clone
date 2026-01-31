# Task 0.2 — Project Structure (Monorepo)

## Why a Monorepo?

We have 5 microservices + a frontend + shared utilities. There are two ways to organize this:

```
OPTION A — Multi-repo (separate git repos):
  uber-api-gateway/       ← its own repo
  uber-user-service/      ← its own repo
  uber-ride-service/      ← its own repo
  ... (hard to manage, version sync is painful)

OPTION B — Monorepo (one repo, many projects):    ← WE USE THIS
  uber-web-clone/
  ├── services/
  │   ├── api-gateway/
  │   ├── user-service/
  │   └── ...
  ├── frontend/
  └── shared/
```

**Monorepo advantages for learning:**
- Everything is in one place — easy to navigate
- Shared code lives in `shared/` — no need to publish npm packages
- One `docker-compose.yml` manages all infrastructure
- One git history for the whole project

**In production**, large companies (Google, Meta) use monorepos but with specialized tooling.
Smaller teams often use multi-repo. Both are valid — we pick monorepo for simplicity.

## Our Folder Structure

```
uber-web-clone/
├── docker-compose.yml        ← Infrastructure (DB, Kafka, Redis)
├── services/
│   ├── api-gateway/          ← Port 3000 — Routes requests to services
│   ├── user-service/         ← Port 3001 — Auth, profiles
│   ├── ride-service/         ← Port 3002 — Ride lifecycle, matching
│   ├── location-service/     ← Port 3003 — GPS tracking, geospatial
│   └── notification-service/ ← Port 3004 — Kafka consumer, alerts
├── frontend/                 ← React app (Vite)
├── shared/                   ← Shared utilities, constants
├── notes/                    ← Learning notes per task
├── SESSION_NOTES.md          ← Progress tracker
└── SYLLABUS.md               ← Full course plan
```

## Why Each Service Is Independent

Each service has its **own** `package.json` and `node_modules`. This is key:

```
services/user-service/
├── package.json        ← Only user-service dependencies
├── node_modules/       ← Only user-service packages
└── index.js            ← Entry point

services/ride-service/
├── package.json        ← Only ride-service dependencies (might differ!)
├── node_modules/
└── index.js
```

This means:
- **user-service** can use `bcrypt` and `jsonwebtoken` (for auth)
- **ride-service** can use `kafkajs` and `ioredis` (for events + geo)
- They don't carry each other's baggage
- You can deploy/restart one without touching the others

## What Is Express?

Express is a minimal web framework for Node.js. It lets you:
1. Listen on a port for HTTP requests
2. Define routes (URL paths) and what happens when they're hit
3. Use middleware (functions that run before your route handler)

```javascript
const express = require('express');
const app = express();

app.use(express.json());    // Middleware: parse JSON request bodies

app.get('/', (req, res) => {          // Route: GET /
  res.json({ status: 'running' });    // Send JSON response
});

app.listen(3001, () => {              // Start listening on port 3001
  console.log('Running on port 3001');
});
```

## Why Different Ports?

Each service runs on its own port because they're separate processes:

```
Your Machine (localhost)
┌─────────────────────────────────────────────┐
│                                             │
│  :3000 → api-gateway      (main entry)     │
│  :3001 → user-service      (auth, users)    │
│  :3002 → ride-service      (rides)          │
│  :3003 → location-service  (GPS, tracking)  │
│  :3004 → notification-svc  (alerts)         │
│                                             │
│  :5432 → PostgreSQL (Docker)                │
│  :6379 → Redis (Docker)                     │
│  :9092 → Kafka (Docker)                     │
│  :2181 → Zookeeper (Docker)                 │
└─────────────────────────────────────────────┘
```

In production, these would be on separate machines/containers — ports wouldn't conflict.
Locally, we use different port numbers to simulate that separation.

## Exercise

1. Initialize each service with `npm init -y` and `npm install express`
2. Create an `index.js` in each service with a basic Express server
3. Add a `"start": "node index.js"` script to each `package.json`

## Verification

Run any service and check it responds:
```bash
cd services/user-service
npm start
# Open browser: http://localhost:3001
# Should see: {"service":"user-service","status":"running"}
```

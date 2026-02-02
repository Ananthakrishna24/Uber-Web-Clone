# SESSION NOTES — Uber Web Clone (Learning Project)

> **IMPORTANT FOR CLAUDE:** Read this file at the START of every new chat session.
> This file tracks where we left off so you can continue teaching seamlessly.

---

## PROJECT PURPOSE

This is a **learning project** — NOT a production build. The goal is to teach:
1. **Apache Kafka** — Event streaming, producers/consumers, topics, partitions
2. **Redis** — Caching, pub/sub, geospatial queries, session management
3. **System Design** — Microservices, API gateway, load balancing, async communication

The student is building an **Uber clone (web-based)** using:
- **Backend:** Node.js microservices (Express 5)
- **Frontend:** React
- **Database:** PostgreSQL
- **Message Broker:** Apache Kafka
- **Cache/Realtime:** Redis
- **Containerization:** Docker + Docker Compose
- **Simulated:** GPS/location (browser geolocation + mock), maps (Leaflet.js with OpenStreetMap)

## STUDENT PROFILE

- **Level:** Beginner (knows JS basics, some Express, new to microservices)
- **Teaching style needed:** Explain concepts BEFORE code, use diagrams (ASCII),
  ask them to try first, then review. Don't just hand them code.
- **Docker:** Installed and ready

## CODE STANDARDS

- **Modern JS only:** Use ES module syntax (`import`/`export`) — NOT `require()`/`module.exports`
- **Express 5:** All services use Express 5 (`"type": "module"` in `package.json`)
- **Use `const`/`let`** — never `var`
- **Arrow functions** where appropriate
- **Template literals** for string interpolation
- **Context7:** Before writing code for any library/package, use the Context7 MCP tool (`resolve-library-id` → `query-docs`) to fetch the latest documentation. Do NOT rely on outdated patterns.

---

## CURRENT PROGRESS

| Module | Status      | Date Started | Date Completed |
|--------|-------------|--------------|----------------|
| 0      | COMPLETED   | 2026-01-31   | 2026-01-31     |
| 1      | COMPLETED   | 2026-01-31   | 2026-02-01     |
| 2      | COMPLETED   | 2026-02-01   | 2026-02-01     |
| 3      | IN PROGRESS | 2026-02-01   | —              |
| 4      | NOT STARTED | —            | —              |
| 5      | NOT STARTED | —            | —              |
| 6      | NOT STARTED | —            | —              |
| 7      | NOT STARTED | —            | —              |
| 8      | NOT STARTED | —            | —              |
| 9      | NOT STARTED | —            | —              |
| 10     | NOT STARTED | —            | —              |

**Last session ended at:** Module 3, Task 3.2 COMPLETED
**Next session should start at:** Module 3, Task 3.3
**Any blockers/notes:** No ORMs — using raw SQL + pg for transparency. Using node --watch for dev auto-restart.

---

## SESSION LOG

### Session 1 — [DATE]
- Created syllabus and project structure

### Session 2 — 2026-01-31
- Completed Task 0.1: Docker Compose setup (PostgreSQL, Kafka, Zookeeper, Redis)
- Completed Task 0.2: Created monorepo folder structure + initialized all 5 services with Express 5 & ES modules
- Upgraded all services to modern JS (ES modules, Express 5.2.1, `import`/`export`)
- Added `.gitignore`
- Created `notes/module-00-environment/task-0.2-project-structure.md`
- Added CODE STANDARDS section to session notes (modern JS, Context7 usage)
- Added "When Starting a Task" instructions for Claude (auto-create notes files)
- Configured Context7 MCP server for fetching latest library docs
- Completed Task 0.3: Added GET /health endpoints to all 5 services with live uptime
- Learned: monolith vs microservices, health check pattern, definition-time vs call-time evaluation
- Next: Task 0.4 — Connect to PostgreSQL from User Service
- Completed Task 0.4: Connected user-service to PostgreSQL using `pg` with connection pooling
- Created `src/db.js` with Pool, env var config, and exported query helper
- Updated `/health` to include live database status
- Module 0 complete! Next: Module 1 — User Service & Authentication
- Completed Task 1.1: Created `users` table with UUID primary key, unique email index, role CHECK constraint
- Decision: No ORM — raw SQL + `pg` for learning transparency
- Completed Task 1.2: Registration endpoint with bcrypt hashing, input validation, duplicate email handling
- Added `npm run dev` scripts (node --watch) to all services, updated start-services.ps1 to start Docker first
- Completed Task 1.3: Login endpoint with bcrypt compare and JWT token generation (24h expiry)
- Completed Task 1.4: Auth middleware (JWT verification) + protected GET /api/users/profile endpoint
- Completed Task 1.5: Driver-specific fields (license_number, vehicle_info JSONB, is_available) + PUT /driver-profile with role-based authorization
- Module 1 complete! Next: Module 2 — API Gateway Pattern

### Session 3 — 2026-02-01
- Completed Task 2.1: API Gateway with http-proxy-middleware proxying /api/users, /api/rides, /api/locations
- Learned: reverse proxy pattern, pathFilter vs Express mount path (mount strips prefix), changeOrigin
- Completed Task 2.2: Edge authentication at gateway — JWT verified once, user info forwarded via X-User-* headers, anti-spoofing header stripping
- Updated user-service auth middleware to accept gateway headers with JWT fallback
- Completed Task 2.3: Rate limiting with Redis — ioredis, INCR + EXPIRE pattern, 100 req/60s, fail-open strategy
- First Redis usage! Verified INCR atomic counter, TTL auto-expiry, 429 response with Retry-After
- Module 2 complete! Next: Module 3 — Redis Deep Dive

### Session 4 — 2026-02-01
- Completed Task 3.1: Session management with Redis — login stores session (SET), gateway checks session (GET), logout deletes session (DEL)
- Installed ioredis in user-service, created src/redis.js, added POST /logout endpoint
- Gateway auth is now async — checks Redis after JWT verification, rejects if session missing or token mismatches (single-session enforcement)
- Bonus: logging in on a second device invalidates the first (stored token changes)
- Completed Task 3.2: User profile caching with cache-aside pattern
- GET /profile checks Redis first (cache hit → skip DB), stores result on miss with 5min TTL
- PUT /driver-profile invalidates cache (DEL) after DB update so next read fetches fresh data
- Key lesson: reads populate cache, writes invalidate it
- Next: Task 3.3 — Redis Pub/Sub

### Session 5 — 2026-02-02
- Started Task 3.3: Redis Pub/Sub — created notes file with concepts (Pub/Sub pattern, Redis vs Kafka, fire-and-forget vs guaranteed delivery)
- Attempted Swagger UI setup (express-oas-generator) — incompatible with Express 5, removed. Using Postman instead.
- Notes file ready at `notes/module-03-redis-deep-dive/task-3.3-redis-pubsub.md`
- No code written yet — student will implement in next session
- Next: Task 3.3 — implement driver-status toggle + pub/sub between services

---

## HOW TO USE THIS FILE (for Claude)

### On Session Start:
1. Read this file FIRST in every new session
2. Check CURRENT PROGRESS table to know where we are
3. Read SYLLABUS.md for the full plan and current module details

### When Starting a Task:
1. Create a **notes file** at `notes/module-XX-<name>/task-X.Y-<slug>.md`
   - Follow the pattern of existing notes (see `task-0.1-docker-compose.md` as reference)
   - Must include: concept explanation (why), ASCII diagrams where helpful, key terms, exercise/assignment, verification steps
   - This is the student's learning reference — make it thorough and beginner-friendly
2. Present the concepts and exercise to the student BEFORE writing code

### When a Task is Completed:
1. **SYLLABUS.md** — Mark the task heading with ✅ and change all `- [ ]` to `- [x]` for that task
2. **SESSION_NOTES.md** — Update ALL of the following:
   - The CURRENT PROGRESS table (module status, dates)
   - The "Last session ended at" / "Next session should start at" lines
   - Add a line to the current session log entry noting what was completed

### When a Module is Completed:
1. Do everything in "When a Task is Completed" above
2. **SESSION_NOTES.md** — Set the module's status to `COMPLETED` and fill in `Date Completed`

### On Session End:
1. Update SESSION_NOTES.md with:
   - What was completed
   - Where to pick up next
   - Any issues or decisions made
2. If it's a new session, add a new `### Session N — [DATE]` entry to the session log

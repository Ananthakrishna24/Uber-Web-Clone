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
- **Backend:** Node.js microservices (Express)
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

---

## CURRENT PROGRESS

| Module | Status      | Date Started | Date Completed |
|--------|-------------|--------------|----------------|
| 0      | IN PROGRESS | 2026-01-31   | —              |
| 1      | NOT STARTED | —            | —              |
| 2      | NOT STARTED | —            | —              |
| 3      | NOT STARTED | —            | —              |
| 4      | NOT STARTED | —            | —              |
| 5      | NOT STARTED | —            | —              |
| 6      | NOT STARTED | —            | —              |
| 7      | NOT STARTED | —            | —              |
| 8      | NOT STARTED | —            | —              |
| 9      | NOT STARTED | —            | —              |
| 10     | NOT STARTED | —            | —              |

**Last session ended at:** Module 0, Task 0.2 completed
**Next session should start at:** Module 0, Task 0.3
**Any blockers/notes:** None

---

## SESSION LOG

### Session 1 — [DATE]
- Created syllabus and project structure

### Session 2 — 2026-01-31
- Completed Task 0.1: Docker Compose setup (PostgreSQL, Kafka, Zookeeper, Redis)
- Completed Task 0.2: Created monorepo folder structure (services/, frontend/, shared/)
- Next: Task 0.3 — Basic Express Microservice Pattern

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

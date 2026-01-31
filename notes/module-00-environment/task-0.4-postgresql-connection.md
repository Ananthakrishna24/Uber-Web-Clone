# Task 0.4 — Connect to PostgreSQL from User Service

## What You'll Learn
- What a **database connection pool** is and why it matters
- How to use **environment variables** to configure your app
- How to connect Node.js to PostgreSQL using the `pg` library
- How to test your connection with a simple query

---

## Concept: Why Does User Service Need a Database?

Right now, our services are "stateless" — they don't remember anything. If you restart user-service, all data is gone (because there IS no data). We need a database to store users, and PostgreSQL is where we'll keep that data.

```
Currently:
┌──────────────┐
│ User Service │ ← knows nothing, stores nothing
│  (Express)   │
└──────────────┘

After this task:
┌──────────────┐         ┌──────────────┐
│ User Service │────────→│  PostgreSQL  │
│  (Express)   │  query  │  (Database)  │
└──────────────┘         └──────────────┘
                         Already running
                         in Docker!
```

Remember — PostgreSQL is already running in your Docker Compose setup from Task 0.1. We just need to connect to it.

---

## Concept: Client vs Connection Pool

There are two ways to talk to PostgreSQL from Node.js:

### Option A: Single Client (Bad for servers)
```
Request 1 ──→ ┌────────┐     ┌──────────┐
Request 2 ──→ │ Client │────→│ Postgres │
Request 3 ──→ └────────┘     └──────────┘
               ONE connection
               Requests wait in line!
```

A single **Client** opens ONE connection to the database. If your server gets 100 requests at the same time, they all have to wait for that single connection. It's like a restaurant with only one table — everyone waits.

### Option B: Connection Pool (What we'll use)
```
Request 1 ──→ ┌─── Connection 1 ───┐     ┌──────────┐
Request 2 ──→ │─── Connection 2 ───│────→│ Postgres │
Request 3 ──→ │─── Connection 3 ───│     └──────────┘
              └─── Connection 4 ───┘
               MANY connections ready to go!
               Requests handled in parallel!
```

A **Pool** manages MULTIPLE connections. When a request needs the database, the pool hands out an available connection. When the request is done, the connection goes back to the pool. It's like a restaurant with many tables — multiple customers served at once.

### Why Pool > Client for servers:
| Feature | Client | Pool |
|---------|--------|------|
| Connections | 1 | Many (default: 10) |
| Parallel queries | No | Yes |
| Auto-reconnect | No | Yes |
| Good for servers | No | **Yes** |

**Rule of thumb:** Always use `Pool` in a server. Use `Client` only for one-off scripts.

---

## Concept: Environment Variables

Hardcoding database credentials in your code is **dangerous**:

```javascript
// BAD — never do this!
const pool = new Pool({
  host: 'localhost',
  user: 'user',
  password: 'password',    // ← This ends up in git!
  database: 'mydb'
})
```

Instead, we use **environment variables** — values set OUTSIDE your code:

```javascript
// GOOD — reads from environment
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
})
```

**Where do environment variables come from?**
- A `.env` file (for local development)
- Docker Compose `environment:` section (for containers)
- Cloud platform settings (for production)

The key idea: **your code stays the same**, but the configuration changes per environment.

```
Local development:     DB_HOST=localhost     DB_PASSWORD=password
Production server:     DB_HOST=db.aws.com   DB_PASSWORD=s3cur3P@ss!
Test environment:      DB_HOST=testdb       DB_PASSWORD=testpass

Same code runs in all three! Only the env vars change.
```

---

## Concept: `pg` Library Basics

The `pg` (node-postgres) library is the standard PostgreSQL client for Node.js.

Key things to know:
- `import pg from 'pg'` — the library uses a default export
- `const { Pool } = pg` — destructure to get the Pool class
- `pool.query(sql, params)` — run a SQL query
- `$1, $2, $3` — parameterized queries (prevents SQL injection!)
- `result.rows` — the data returned from a query

```javascript
// How a query result looks:
const result = await pool.query('SELECT NOW()');
// result = {
//   rows: [ { now: 2026-01-31T... } ],   ← the data
//   rowCount: 1,                           ← how many rows
//   fields: [ ... ]                        ← column info
// }
```

---

## Your Exercise

### Step 1: Make sure Docker is running

Your PostgreSQL container needs to be up. Run:
```bash
docker compose up -d postgres
```

Verify it's running:
```bash
docker ps
```
You should see `postgres_db` in the list.

### Step 2: Install the `pg` package

From the `services/user-service/` directory, install node-postgres:
```bash
npm install pg
```

### Step 3: Create a database connection module

Create a new file at `services/user-service/src/db.js`.

This file should:
1. Import `pg` and destructure `Pool` from it
2. Create a new `Pool` with connection settings from environment variables:
   - `DB_HOST` (default: `'localhost'`)
   - `DB_PORT` (default: `5432`)
   - `DB_USER` (default: `'user'`)
   - `DB_PASSWORD` (default: `'password'`)
   - `DB_NAME` (default: `'microservices_db'`)
3. Export a `query` function that calls `pool.query(text, params)`
4. Export the `pool` itself (we'll need it later for shutdown)

**Hints:**
- Use `process.env.DB_HOST || 'localhost'` to provide defaults
- The defaults should match your `docker-compose.yml` values
- Keep it simple — this file should be ~15 lines

### Step 4: Update `index.js` to test the connection

In your `index.js`:
1. Import your `query` function from `./src/db.js`
2. Add a test query when the server starts — run `SELECT NOW()` and log the result
3. Update the `/health` endpoint to include database status

**Think about:** What should happen if the database connection fails? Should the server crash, or should it start anyway and report "unhealthy"?

### Try it yourself first!
Once you've attempted Steps 2-4, share your code and we'll review it together.

---

## Verification Checklist
- [ ] `pg` is installed in user-service (check `package.json`)
- [ ] `src/db.js` exists with a Pool and exported query function
- [ ] Server logs the current time from PostgreSQL on startup
- [ ] `GET /health` includes database connectivity info
- [ ] Connection uses environment variables (not hardcoded values)

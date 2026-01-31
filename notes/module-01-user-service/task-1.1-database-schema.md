# Task 1.1 — Database Schema Design

## What You'll Learn
- How to design a database table for storing users
- What **primary keys**, **indexes**, and **constraints** are
- What a **SQL migration** is and why we run them manually first
- Why UUIDs are better than auto-increment IDs in microservices

---

## Concept: What is a Database Schema?

A schema is the **blueprint** of your database — it defines what tables exist, what columns each table has, and what rules the data must follow.

Think of it like a spreadsheet template:

```
USERS TABLE (the blueprint)
┌──────────┬─────────┬───────────────┬──────┬────────┬────────────┐
│ id       │ email   │ password_hash │ name │ role   │ created_at │
│ (uuid)   │ (text)  │ (text)        │(text)│ (text) │ (timestamp)│
├──────────┼─────────┼───────────────┼──────┼────────┼────────────┤
│ must be  │ must be │ must exist    │ must │ rider  │ auto-set   │
│ unique   │ unique  │               │exist │ or     │ when row   │
│          │         │               │      │ driver │ is created │
└──────────┴─────────┴───────────────┴──────┴────────┴────────────┘
```

Before writing any code to register users or handle logins, we need to **create this table** in PostgreSQL.

---

## Concept: Primary Keys — UUID vs Auto-Increment

Every row in a database table needs a unique identifier (primary key). There are two common approaches:

### Auto-Increment (Serial)
```sql
id SERIAL PRIMARY KEY   -- 1, 2, 3, 4, 5...
```
- Simple, human-readable
- **Problem in microservices:** If two services create IDs independently, they could collide
- **Problem:** Exposes information — user #5 knows there are at least 5 users
- **Problem:** If you merge databases, IDs conflict

### UUID (What we'll use)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
- Universally unique: `550e8400-e29b-41d4-a716-446655440000`
- Generated independently — no coordination needed between services
- No information leakage
- Virtually impossible to collide (more UUIDs than atoms in the universe)

```
Why UUID matters for microservices:

Service A generates: a1b2c3d4-...
Service B generates: e5f6g7h8-...
                     ↑
            No collision! Each service can
            generate IDs independently without
            talking to each other.

With auto-increment:
Service A generates: 1, 2, 3
Service B generates: 1, 2, 3   ← COLLISION!
```

**Rule of thumb:** Use UUIDs in microservices. Use auto-increment in simple monoliths.

---

## Concept: Indexes — Making Queries Fast

An index is like the index at the back of a textbook. Without it, the database scans every single row to find what you're looking for.

```
WITHOUT INDEX (full table scan):
Looking for email = "alice@example.com"

  Row 1: bob@...       ← check... no
  Row 2: charlie@...   ← check... no
  Row 3: alice@...     ← check... FOUND! (but had to read 3 rows)
  Row 4: dave@...      ← still checks all rows!
  ...
  Row 1,000,000: ...   ← SLOW when table is big

WITH INDEX on email:
  Index: alice@ → Row 3   ← jumps straight there!
  FAST even with 1,000,000 rows
```

### Which columns should have indexes?
- Columns you **search by** frequently (email for login)
- Columns you use in **WHERE** clauses
- Primary keys get an index automatically

### UNIQUE constraint
A `UNIQUE` constraint is an index that ALSO prevents duplicates:
```sql
email VARCHAR(255) UNIQUE NOT NULL
```
This means:
1. Fast lookups by email (it's indexed)
2. Two users can't have the same email (database enforces this)

---

## Concept: SQL Migrations

A **migration** is a SQL script that changes your database structure. We call it a "migration" because it migrates the database from one shape to another.

```
Migration 001: Create users table
┌──────────────┐         ┌──────────────┐
│  Empty DB    │  ──→    │  DB with     │
│  (no tables) │  RUN    │  users table │
└──────────────┘  SQL    └──────────────┘
```

### Why not just use an ORM?
ORMs (like Prisma, Sequelize) auto-generate SQL for you. We're writing SQL manually first because:
1. **You need to understand what the ORM does under the hood**
2. SQL is the universal database language — works everywhere
3. When something goes wrong, you need to debug the actual SQL
4. Interview questions are in SQL, not ORM syntax

Later in the project, you can decide if you want to add an ORM.

---

## Concept: Choosing Data Types

PostgreSQL has many data types. Here's what we'll use and why:

| Column | Type | Why this type? |
|--------|------|----------------|
| `id` | `UUID` | Unique across services, no coordination needed |
| `email` | `VARCHAR(255)` | Text with a max length — emails shouldn't be longer |
| `password_hash` | `VARCHAR(255)` | We store the HASH, never the actual password |
| `name` | `VARCHAR(100)` | User's display name |
| `role` | `VARCHAR(10)` | Either 'rider' or 'driver' |
| `created_at` | `TIMESTAMPTZ` | When the account was created (with timezone) |

**Why `password_hash` and not `password`?**
We NEVER store passwords directly. We store a one-way hash (using bcrypt, which we'll learn in Task 1.2). Even if someone steals the database, they can't reverse the hash to get passwords.

```
password: "mySecret123"
    ↓ bcrypt hash (one-way)
hash: "$2b$10$N9qo8uLOickgx2ZMRZoMye..."
    ↓ can you reverse it?
    ✗ NO! That's the whole point.
```

---

## Your Exercise

### Step 1: Create a migrations folder

Create the folder `services/user-service/migrations/` — this is where all our SQL migration files will live.

### Step 2: Write the migration SQL

Create a file `services/user-service/migrations/001_create_users_table.sql` with:

1. A `CREATE TABLE` statement for the `users` table with these columns:
   - `id` — UUID, primary key, auto-generated default
   - `email` — VARCHAR(255), unique, not null
   - `password_hash` — VARCHAR(255), not null
   - `name` — VARCHAR(100), not null
   - `role` — VARCHAR(10), not null, default `'rider'`, must be either `'rider'` or `'driver'`
   - `created_at` — TIMESTAMPTZ, defaults to the current time

2. A `CHECK` constraint on `role` so it only accepts `'rider'` or `'driver'`

**Hints:**
- Use `gen_random_uuid()` for the UUID default
- Use `NOW()` for the timestamp default
- Use `CHECK (role IN ('rider', 'driver'))` to restrict role values

### Step 3: Run the migration

Execute your SQL file against the running PostgreSQL container:
```bash
docker exec -i postgres_db psql -U user -d microservices_db < migrations/001_create_users_table.sql
```

### Step 4: Verify the table exists

Connect to PostgreSQL and inspect:
```bash
docker exec -it postgres_db psql -U user -d microservices_db
```

Then run:
```sql
\dt           -- list all tables
\d users      -- describe the users table
```

### Try it yourself first!
Write the SQL migration file, run it, and verify the table was created. Then share your SQL and we'll review it together.

---

## Verification Checklist
- [ ] `migrations/` folder exists in user-service
- [ ] `001_create_users_table.sql` contains valid CREATE TABLE SQL
- [ ] Migration ran successfully against PostgreSQL
- [ ] `\d users` shows all columns with correct types
- [ ] `email` column has a UNIQUE constraint
- [ ] `role` column has a CHECK constraint
- [ ] `id` defaults to `gen_random_uuid()`
- [ ] `created_at` defaults to `NOW()`

# Task 1.5 — Driver-Specific Fields

## What You'll Learn
- How to **alter** an existing table with new columns (SQL migrations)
- Using **JSONB** in PostgreSQL to store flexible/nested data
- **Role-based authorization** — restricting endpoints by user role
- The difference between **authentication** (who are you?) and **authorization** (are you allowed?)

---

## Concept: Authentication vs Authorization

These are two separate checks:

```
Authentication (Task 1.4):  "Who are you?"
  → Verify JWT → attach req.user
  → Answer: "You are user abc-123 with role=driver"

Authorization (Task 1.5):   "Are you ALLOWED to do this?"
  → Check req.user.role
  → Answer: "Only drivers can update driver profiles"
```

```
Request arrives
    │
    ▼
┌──────────────┐
│ authenticate │  ← Is the JWT valid? (Authentication)
└──────┬───────┘
       │ yes → req.user set
       ▼
┌──────────────┐
│  authorize   │  ← Is req.user.role === 'driver'? (Authorization)
└──────┬───────┘
       │ yes
       ▼
┌──────────────┐
│ Route handler│  ← Update driver profile
└──────────────┘
```

We implement authorization as **another middleware** — a function that checks the role and either calls `next()` or returns 403 Forbidden.

---

## Concept: JSONB in PostgreSQL

`vehicle_info` stores structured data like make, model, color, plate number. Instead of creating 4+ separate columns, we use PostgreSQL's **JSONB** type:

```sql
-- JSONB lets you store JSON objects as a column value
vehicle_info JSONB DEFAULT '{}'

-- You can query inside JSONB:
SELECT * FROM users WHERE vehicle_info->>'make' = 'Toyota';

-- You can index JSONB for performance (later):
CREATE INDEX ON users USING gin (vehicle_info);
```

**Why JSONB over JSON?**
- JSONB is stored in a binary format — faster to query
- JSONB supports indexing
- JSONB removes duplicate keys and doesn't preserve whitespace (slightly smaller)

For our learning project, JSONB is the right choice for flexible nested data.

---

## Concept: ALTER TABLE — Adding Columns to an Existing Table

We already have a `users` table with data in it. We can't just drop and recreate it. Instead:

```sql
ALTER TABLE users ADD COLUMN license_number VARCHAR(50);
ALTER TABLE users ADD COLUMN vehicle_info JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN is_available BOOLEAN DEFAULT false;
```

These columns are **nullable** (except `is_available` which defaults to `false`). Riders won't use them, and drivers fill them in later via the profile endpoint.

---

## Concept: The `authorize` Middleware Pattern

We create a **middleware factory** — a function that returns middleware:

```javascript
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Usage:
router.put('/driver-profile', authenticate, authorize('driver'), handler);
```

This is a common pattern: `authorize('driver')` returns a middleware function. You can also do `authorize('driver', 'admin')` for multiple roles.

---

## What Was Built

### Migration: `002_add_driver_fields.sql`
- Adds `license_number` (VARCHAR), `vehicle_info` (JSONB), `is_available` (BOOLEAN) to users table

### `src/middleware/authorize.js` — Role-based authorization middleware
- Factory function that accepts allowed roles
- Returns 403 Forbidden if user's role isn't in the list

### `src/routes/auth.js` — added `PUT /driver-profile` (protected + driver-only)
- Requires authentication AND `role=driver`
- Updates license_number, vehicle_info, is_available
- Returns the updated user profile

### Test Results

| Test | Result |
|------|--------|
| Driver updates own profile | 200 + updated profile |
| Rider tries to update driver profile | 403 Forbidden |
| No token | 401 No token provided |
| Valid token, missing fields | 200 (partial update OK) |

---

## Verification
- [ ] Migration adds three new columns to users table
- [ ] `PUT /api/users/driver-profile` requires authentication
- [ ] `PUT /api/users/driver-profile` rejects non-driver roles with 403
- [ ] Driver can update license_number, vehicle_info, and is_available
- [ ] Response includes updated fields without password_hash

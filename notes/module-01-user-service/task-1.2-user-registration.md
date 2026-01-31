# Task 1.2 — User Registration Endpoint

## What You'll Learn
- How password hashing with **bcrypt** works
- How to build a **POST** endpoint that validates input and inserts into PostgreSQL
- How to handle **duplicate entries** gracefully (error code `23505`)
- Why you **never return the password hash** to the client

---

## Concept: Password Hashing with bcrypt

You NEVER store passwords as plain text. If your database leaks, every user's password is exposed.

```
Plain text storage (NEVER DO THIS):
  Database: { email: "alice@x.com", password: "mySecret123" }
  Hacker steals DB → knows Alice's password instantly

Hashed storage (what we do):
  Database: { email: "alice@x.com", password_hash: "$2b$10$N9qo8u..." }
  Hacker steals DB → can't reverse the hash → password is safe
```

### How bcrypt works:
1. **Salt** — a random string added to the password before hashing (prevents rainbow table attacks)
2. **Rounds** (cost factor) — how many times the hash is computed. We use 10 rounds. Higher = slower = more secure.
3. **Hash** — the one-way output. Same password + same salt = same hash. But you can't go backwards.

```javascript
const salt = await bcrypt.genSalt(10);           // random salt
const hash = await bcrypt.hash('mySecret', salt); // one-way hash
// hash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl..."

await bcrypt.compare('mySecret', hash);   // true
await bcrypt.compare('wrongPass', hash);  // false
```

---

## Concept: Input Validation

Always validate user input at the API boundary:
- **Required fields** — don't insert empty data
- **Email format** — basic regex check
- **Password length** — minimum 6 characters
- **Role value** — must be 'rider' or 'driver'

Validation happens BEFORE any database call. Fail fast.

---

## Concept: RETURNING clause (PostgreSQL)

Instead of inserting then querying to get the new row, PostgreSQL lets you do both at once:

```sql
INSERT INTO users (email, password_hash, name, role)
VALUES ($1, $2, $3, $4)
RETURNING id, email, name, role, created_at;
```

This inserts the row AND returns the specified columns — no second query needed.
Notice: we return `id, email, name, role, created_at` but NOT `password_hash`.

---

## Files Created

### `src/routes/auth.js`
- `POST /register` — validates input, hashes password, inserts user, returns user object
- Uses parameterized queries (`$1, $2, $3, $4`) to prevent SQL injection
- Catches PostgreSQL error code `23505` (unique violation) for duplicate emails

### `index.js` (updated)
- Mounts auth routes at `/api/users`

---

## Verification
- [x] `POST /api/users/register` with valid data → 201 + user object (no password_hash)
- [x] Duplicate email → 409 "Email already registered"
- [x] Missing fields → 400 with error message
- [x] Invalid email format → 400 with error message
- [x] Driver role → stored correctly with role: "driver"

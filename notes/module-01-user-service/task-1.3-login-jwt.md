# Task 1.3 — User Login & JWT

## What You'll Learn
- How **JWT (JSON Web Tokens)** work for stateless authentication
- The three parts of a JWT: header, payload, signature
- How to generate and return a token on login
- Why we give the same error for "wrong email" and "wrong password"

---

## Concept: What is a JWT?

A JWT is a **signed token** that proves who a user is. After login, the server gives the client a token. The client sends it with every request to prove their identity.

```
LOGIN FLOW:

1. Client sends email + password
2. Server checks credentials
3. Server generates JWT with user info
4. Client stores the token
5. Client sends token with every future request

┌────────┐                    ┌────────────┐
│ Client │ ── email+pass ──→  │   Server   │
│        │ ←── JWT token ──   │            │
│        │                    │            │
│        │ ── JWT in header → │ Checks JWT │
│        │ ←── data ────────  │ Returns OK │
└────────┘                    └────────────┘
```

### Why JWT instead of sessions?
- **Stateless** — the server doesn't need to store session data
- **Scalable** — any server can verify the token (no shared session store needed)
- **Self-contained** — the token carries the user info inside it

---

## Concept: JWT Structure

A JWT has three parts separated by dots: `header.payload.signature`

```
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyIsInJvbGUiOiJyaWRlciJ9.abc123signature

├── Header ──┤├───── Payload ────────────────────────┤├── Signature ─┤
```

### Header (algorithm info)
```json
{ "alg": "HS256", "typ": "JWT" }
```

### Payload (the actual data)
```json
{
  "id": "22568863-b79c-44f9-ac4e-1b4987d8beff",
  "email": "alice@example.com",
  "role": "rider",
  "iat": 1769921514,     ← issued at (Unix timestamp)
  "exp": 1770007914      ← expires at (24 hours later)
}
```

### Signature (tamper protection)
```
HMACSHA256(
  base64(header) + "." + base64(payload),
  SECRET_KEY
)
```

The signature ensures nobody can modify the payload without the secret key.
If someone changes `role: "rider"` to `role: "admin"`, the signature won't match and the server will reject it.

**Try it:** Paste your token at https://jwt.io to see the decoded contents.

---

## Concept: Security — Same Error for Wrong Email and Wrong Password

Notice our login returns the same error for both cases:
```json
{ "error": "Invalid email or password" }
```

Why not say "email not found" or "wrong password"? Because that tells an attacker:
- "Email not found" → this email isn't registered (try another)
- "Wrong password" → this email IS registered (now brute-force the password)

By giving the **same error**, we don't leak whether the email exists.

---

## Concept: JWT Secret

The secret key used to sign tokens must be:
- **Long and random** in production
- **Never committed to git**
- **The same across server restarts** (otherwise old tokens become invalid)

We use an environment variable with a dev fallback:
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
```

---

## What Was Built

### `src/routes/auth.js` — added `POST /login`
- Looks up user by email
- Compares password with bcrypt
- Generates JWT with `{ id, email, role }` payload, expires in 24h
- Returns token + user object (no password_hash)

### Test Results
| Test | Result |
|------|--------|
| Correct credentials | 200 + token + user |
| Wrong password | 401 "Invalid email or password" |
| Non-existent email | 401 "Invalid email or password" |
| Missing fields | 400 "email and password are required" |

---

## Verification
- [x] `POST /api/users/login` accepts email and password
- [x] Compares password with bcrypt
- [x] Returns JWT token with user id and role
- [x] Token expires in 24 hours
- [x] Same error message for wrong email and wrong password

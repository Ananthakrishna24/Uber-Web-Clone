# Task 1.4 — Auth Middleware

## What You'll Learn
- What **middleware** is and how the Express **request pipeline** works
- How to protect routes so only logged-in users can access them
- The `Authorization: Bearer <token>` convention
- How `req.user` gets populated from a JWT

---

## Concept: What is Middleware?

Middleware is a function that runs **between** receiving a request and sending a response. You've already used middleware — `express.json()` is middleware that parses JSON bodies.

```
Every middleware has this signature:

(req, res, next) => {
  // Do something with req or res
  // Then either:
  //   next()        → pass to the next middleware/route
  //   res.status()  → end the request here (don't call next)
}
```

### The Request Pipeline

Express processes middleware **in order**. Each one can modify the request, end it, or pass it along:

```
Request arrives
    │
    ▼
┌────────────────┐
│ express.json() │  ← Parses body → req.body available
└───────┬────────┘
        │ next()
        ▼
┌────────────────┐
│  authenticate  │  ← Verifies JWT → req.user available
└───────┬────────┘     OR returns 401 (stops here)
        │ next()
        ▼
┌────────────────┐
│ Route handler  │  ← Your actual business logic
│ GET /profile   │     Can safely use req.user
└────────────────┘
```

**Key insight:** Middleware that calls `next()` passes control forward. Middleware that sends a response (like `res.status(401)`) **stops** the chain — the route handler never runs.

---

## Concept: The Authorization Header

The standard way to send a JWT is in the `Authorization` header using the **Bearer** scheme:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6...
```

Why "Bearer"? It means "the bearer (holder) of this token is authorized." It's an HTTP convention (RFC 6750).

### Extracting the Token

```javascript
const authHeader = req.headers.authorization;
// "Bearer eyJhb..."

const token = authHeader.split(' ')[1];
// "eyJhb..."
```

---

## Concept: Selective Middleware (Per-Route vs Global)

You can apply middleware two ways:

### Global — every route gets it
```javascript
app.use(authenticate);  // ALL routes require auth
```

### Per-route — only specific routes get it
```javascript
router.get('/profile', authenticate, (req, res) => { ... });
//                      ↑ only this route requires auth

router.post('/register', (req, res) => { ... });
//                       ↑ no auth needed here
```

We use **per-route** middleware because login and register shouldn't require authentication!

---

## What Was Built

### `src/middleware/auth.js` — JWT verification middleware
- Reads `Authorization: Bearer <token>` header
- Verifies token with `jwt.verify()`
- Attaches decoded payload to `req.user`
- Returns 401 if token is missing, invalid, or expired

### `src/routes/auth.js` — added `GET /profile` (protected)
- Uses `authenticate` middleware
- Queries the database for the user by `req.user.id`
- Returns user profile (no password_hash)

### How Errors Are Handled

| Scenario | Response |
|----------|----------|
| No Authorization header | 401 `"No token provided"` |
| Malformed header (no "Bearer") | 401 `"No token provided"` |
| Invalid/tampered token | 401 `"Invalid or expired token"` |
| Expired token | 401 `"Invalid or expired token"` |
| Valid token | `next()` → route runs with `req.user` |

---

## Verification
- [ ] `GET /api/users/profile` with valid token returns user data
- [ ] `GET /api/users/profile` without token returns 401
- [ ] `GET /api/users/profile` with invalid token returns 401
- [ ] `req.user` contains `id`, `email`, and `role` from the JWT

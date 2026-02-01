# Task 2.2 — Auth at the Gateway

## What You'll Learn
- **Edge authentication** — verify JWT once at the gateway, not in every service
- How to forward user identity via **custom HTTP headers** (`X-User-*`)
- The **internal network trust model** — why services trust the gateway
- Which routes should be **public** (no auth) vs **protected**

---

## Concept: Edge Authentication vs Service-Level Auth

### Service-Level (what we had before)
```
Client → Gateway → User Service
                   ↳ reads Authorization header
                   ↳ calls jwt.verify()
                   ↳ sets req.user

Client → Gateway → Ride Service
                   ↳ reads Authorization header (same logic!)
                   ↳ calls jwt.verify() (same logic!)
                   ↳ sets req.user (same logic!)
```

**Problem:** Every service needs `jsonwebtoken`, the same `JWT_SECRET`, and the same verification logic. If you change the JWT structure, you update every service.

### Edge Authentication (what we're building)
```
Client → Gateway (verifies JWT here)
              │
              ├──→ User Service    (reads X-User-Id header)
              ├──→ Ride Service    (reads X-User-Id header)
              └──→ Location Service (reads X-User-Id header)
```

**Benefits:**
- JWT secret only lives in the gateway
- Services get pre-verified user info via headers
- Change auth logic in ONE place

---

## Concept: The Trust Model

```
EXTERNAL (untrusted)           INTERNAL (trusted)
┌──────────┐     ┌──────────┐     ┌─────────────┐
│  Client  │────→│ Gateway  │────→│  Services   │
│(internet)│     │(verifies)│     │(trust gate) │
└──────────┘     └──────────┘     └─────────────┘
                 ↑                 ↑
            Public-facing     Internal only
            Verifies tokens   Trust X-User-* headers
```

In production, backend services are on a **private network** — only the gateway can reach them. So when a service sees `X-User-Id: abc-123`, it trusts that the gateway already verified the JWT.

**Security note:** The gateway STRIPS any incoming `X-User-*` headers from the client to prevent spoofing. Only the gateway sets these headers.

---

## Concept: Public vs Protected Routes

Not every route needs authentication:

```
PUBLIC (no auth needed):
  POST /api/users/register    ← creating an account
  POST /api/users/login       ← getting a token
  GET  /health                ← health checks

PROTECTED (auth required):
  GET  /api/users/profile     ← need to know WHO is asking
  PUT  /api/users/driver-profile
  POST /api/rides/*           ← (future) ride operations
  *    /api/locations/*       ← (future) location tracking
```

The gateway checks if the route is public. If not, it verifies the JWT before proxying.

---

## What Was Built

### Gateway changes (`index.js`)
- Added `gatewayAuth` middleware that runs before proxy routes
- Public routes bypass auth (register, login, health)
- Protected routes: JWT verified, user info forwarded via headers
- Strips any incoming `X-User-*` headers (anti-spoofing)

### Headers forwarded to services
| Header | Value |
|--------|-------|
| `X-User-Id` | User's UUID |
| `X-User-Email` | User's email |
| `X-User-Role` | `rider` or `driver` |

### User Service changes (`src/middleware/auth.js`)
- Updated to also accept `X-User-Id` header (gateway trust mode)
- Falls back to JWT verification (for direct access during development)

---

## Verification
- [ ] Public routes (register, login) work without token through gateway
- [ ] Protected routes without token return 401 from gateway
- [ ] Protected routes with valid token: gateway forwards X-User-* headers
- [ ] Services can read user info from headers
- [ ] Incoming X-User-* headers from client are stripped (anti-spoofing)

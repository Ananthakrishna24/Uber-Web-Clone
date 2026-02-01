# Task 2.1 — Basic API Gateway

## What You'll Learn
- What an **API Gateway** is and why every microservices system needs one
- The **reverse proxy** pattern
- How `http-proxy-middleware` forwards requests to backend services
- Why the frontend should never talk to backend services directly

---

## Concept: What is an API Gateway?

An API Gateway is the **single entry point** for all client requests. Instead of the frontend knowing every service URL, it talks to one address and the gateway routes requests to the correct service.

```
WITHOUT GATEWAY:
  Frontend must know:
    - http://localhost:3001  (user service)
    - http://localhost:3002  (ride service)
    - http://localhost:3003  (location service)

  Problems:
    ✗ CORS configuration on every service
    ✗ Auth logic duplicated in every service
    ✗ Can't rate-limit centrally
    ✗ Can't change service URLs without updating frontend
    ✗ Service internals exposed to the client

WITH GATEWAY:
  Frontend only knows:
    - http://localhost:3000  (gateway)

  Benefits:
    ✓ Single CORS config
    ✓ Central auth
    ✓ Central rate limiting
    ✓ Services can move/scale without affecting frontend
    ✓ Internal architecture hidden from client
```

---

## Concept: Reverse Proxy

A **reverse proxy** sits in front of your backend services and forwards requests on behalf of the client:

```
Forward Proxy (VPN):   Client → [Proxy] → Internet
                       Hides the CLIENT

Reverse Proxy (Gateway): Internet → [Proxy] → Backend Services
                         Hides the SERVERS
```

The client thinks it's talking to one server. The gateway knows which backend to forward to based on the URL path.

---

## Concept: How http-proxy-middleware Works

```javascript
import { createProxyMiddleware } from 'http-proxy-middleware';

// When a request comes in matching '/api/users', forward it to port 3001
app.use('/api/users', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
}));
```

What happens step by step:

```
1. Client sends:  GET http://localhost:3000/api/users/profile
                                          ↑ gateway port

2. Gateway matches: '/api/users' prefix

3. Forwards to:    GET http://localhost:3001/api/users/profile
                                           ↑ user-service port

4. User Service responds to Gateway

5. Gateway sends response back to Client
```

`changeOrigin: true` rewrites the `Host` header to match the target — needed when proxying to a different host/port.

---

## Concept: Route Mapping

Our gateway routes:

```
┌─────────────────────────────────────────────┐
│           API Gateway (:3000)                │
├─────────────────────────────────────────────┤
│  /api/users/*     → User Service     :3001  │
│  /api/rides/*     → Ride Service     :3002  │
│  /api/locations/* → Location Service :3003  │
│  /health          → Gateway's own health    │
└─────────────────────────────────────────────┘
```

---

## What Was Built

### `index.js` — API Gateway with proxy routing
- Proxies `/api/users` → `http://localhost:3001`
- Proxies `/api/rides` → `http://localhost:3002`
- Proxies `/api/locations` → `http://localhost:3003`
- Keeps its own `/health` endpoint
- Logs each proxied request for debugging

### Verification
- [ ] `GET http://localhost:3000/api/users/health` → proxied to user-service health
- [ ] `POST http://localhost:3000/api/users/register` → proxied to user-service register
- [ ] `GET http://localhost:3000/health` → gateway's own health (not proxied)
- [ ] Requests to unknown paths return 404 from the gateway

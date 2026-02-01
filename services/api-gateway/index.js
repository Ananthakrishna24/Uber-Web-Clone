import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// --- Service URLs ---
const SERVICES = {
  users: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  rides: process.env.RIDE_SERVICE_URL || 'http://localhost:3002',
  locations: process.env.LOCATION_SERVICE_URL || 'http://localhost:3003',
};

// --- Public routes that don't need authentication ---
const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/users/register' },
  { method: 'POST', path: '/api/users/login' },
];

// Checks if the incoming request (method + path) matches any of the defined public routes
const isPublicRoute = (method, path) =>
  PUBLIC_ROUTES.some((r) => r.method === method && path.startsWith(r.path));

// --- Gateway Auth Middleware ---
const gatewayAuth = (req, res, next) => {
  // Security: Remove any fake ID headers the user might have tried to send manually.
  // We only trust headers that WE verify and add later in this function.
  delete req.headers['x-user-id'];
  delete req.headers['x-user-email'];
  delete req.headers['x-user-role'];

  // Skip auth for public routes and gateway's own endpoints
  if (isPublicRoute(req.method, req.path) || !req.path.startsWith('/api/')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Forward user info to downstream services via headers
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// --- Gateway's own endpoints ---
app.get('/', (req, res) => {
  res.json({ service: 'api-gateway', status: 'running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', uptime: process.uptime() });
});

// --- Apply gateway auth before all proxy routes ---
app.use(gatewayAuth);

// --- Proxy routes ---
app.use(createProxyMiddleware({
  target: SERVICES.users,
  changeOrigin: true,
  pathFilter: '/api/users',
  on: {
    proxyReq: (proxyReq, req) => {
      console.log(`[PROXY] ${req.method} ${req.originalUrl} → ${SERVICES.users}`);
    },
  },
}));

app.use(createProxyMiddleware({
  target: SERVICES.rides,
  changeOrigin: true,
  pathFilter: '/api/rides',
  on: {
    proxyReq: (proxyReq, req) => {
      console.log(`[PROXY] ${req.method} ${req.originalUrl} → ${SERVICES.rides}`);
    },
  },
}));

app.use(createProxyMiddleware({
  target: SERVICES.locations,
  changeOrigin: true,
  pathFilter: '/api/locations',
  on: {
    proxyReq: (proxyReq, req) => {
      console.log(`[PROXY] ${req.method} ${req.originalUrl} → ${SERVICES.locations}`);
    },
  },
}));

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Proxying:`);
  console.log(`  /api/users     → ${SERVICES.users}`);
  console.log(`  /api/rides     → ${SERVICES.rides}`);
  console.log(`  /api/locations → ${SERVICES.locations}`);
  console.log(`Auth: edge authentication enabled (${PUBLIC_ROUTES.length} public routes)`);
});

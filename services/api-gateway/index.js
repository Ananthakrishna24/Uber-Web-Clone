import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3000;

// --- Service URLs ---
const SERVICES = {
  users: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  rides: process.env.RIDE_SERVICE_URL || 'http://localhost:3002',
  locations: process.env.LOCATION_SERVICE_URL || 'http://localhost:3003',
};

// --- Gateway's own endpoints ---
app.get('/', (req, res) => {
  res.json({ service: 'api-gateway', status: 'running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', uptime: process.uptime() });
});

// --- Proxy routes ---
// Using pathFilter preserves the full URL path (including /api/users prefix)
// Without pathFilter, Express strips the mount path before forwarding

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
});

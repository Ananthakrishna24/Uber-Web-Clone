import express from 'express';
import { subscriber } from './src/redis.js';

const app = express();
const PORT = 3002;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'ride-service', status: 'running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ride-service', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Ride Service running on port ${PORT}`);
});

subscriber.subscribe('driver-status-changed', (err, count) => {
  if (err) {
    console.error('Failed to subscribe:', err);
  } else {
    console.log(`Subscribed to 1 channel(s): driver-status-changed`);
  }
});

subscriber.on('message', (channel, message) => {
  if (channel === 'driver-status-changed') {
    const event = JSON.parse(message);
    if (event.available) {
      console.log(`[ride-service] Driver ${event.driverId} is now ONLINE — adding to matching pool`);
    } else {
      console.log(`[ride-service] Driver ${event.driverId} is now OFFLINE — removing from matching pool`);
    }
  }
});
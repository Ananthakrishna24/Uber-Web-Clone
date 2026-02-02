import express from 'express';
import { subscriber } from './src/redis.js';

const app = express();
const PORT = 3003;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'location-service', status: 'running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'location-service', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Location Service running on port ${PORT}`);
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
      console.log(`[location-service] Driver ${event.driverId} is now ONLINE — starting location tracking`);
    } else {
      console.log(`[location-service] Driver ${event.driverId} is now OFFLINE — stopping location tracking`);
    }
  }
});
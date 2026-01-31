import express from 'express';

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

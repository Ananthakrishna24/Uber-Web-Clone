import express from 'express';

const app = express();
const PORT = 3004;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'notification-service', status: 'running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});

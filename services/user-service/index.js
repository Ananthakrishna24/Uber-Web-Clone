import express from 'express';

const app = express();
const PORT = 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'user-service', status: 'running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});

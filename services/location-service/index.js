import express from 'express';

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

import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'api-gateway', status: 'running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

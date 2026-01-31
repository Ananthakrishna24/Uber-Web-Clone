import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'api-gateway', status: 'running' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

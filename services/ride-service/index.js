import express from 'express';

const app = express();
const PORT = 3002;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'ride-service', status: 'running' });
});

app.listen(PORT, () => {
  console.log(`Ride Service running on port ${PORT}`);
});

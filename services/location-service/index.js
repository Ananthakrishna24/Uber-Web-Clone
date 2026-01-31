import express from 'express';

const app = express();
const PORT = 3003;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'location-service', status: 'running' });
});

app.listen(PORT, () => {
  console.log(`Location Service running on port ${PORT}`);
});

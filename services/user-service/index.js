const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'user-service', status: 'running' });
});

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});

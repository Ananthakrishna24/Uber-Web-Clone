import express from 'express';
import { query } from './src/db.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'user-service', status: 'running' });
});

app.get('/health', async (req, res) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({
      status: 'ok',
      service: 'user-service',
      uptime: process.uptime(),
      database: { connected: true, time: result.rows[0].now },
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      service: 'user-service',
      uptime: process.uptime(),
      database: { connected: false, error: err.message },
    });
  }
});

app.listen(PORT, async () => {
  console.log(`User Service running on port ${PORT}`);

  try {
    const result = await query('SELECT NOW()');
    console.log(`PostgreSQL connected — server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error(`PostgreSQL connection failed: ${err.message}`);
  }
});

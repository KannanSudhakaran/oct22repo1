const pool = require('../db/pool');

const DB_CHECK_TIMEOUT_MS = 2000;

async function health(req, res) {
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB health check timed out')), DB_CHECK_TIMEOUT_MS)
      ),
    ]);
    return res.status(200).json({ status: 'ok', db: 'ok' });
  } catch (err) {
    return res.status(503).json({ status: 'degraded', db: 'error' });
  }
}

module.exports = { health };

const pool = require('../db/pool');

function toPublicCategory(row) {
  return { id: row.id, userId: row.user_id, name: row.name, createdAt: row.created_at };
}

async function list(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, user_id, name, created_at FROM categories WHERE user_id = $1 ORDER BY id ASC',
      [req.user.id]
    );
    return res.status(200).json({ categories: result.rows.map(toPublicCategory) });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list };

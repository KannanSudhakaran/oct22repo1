const pool = require('../db/pool');
const { validateCategoryPayload } = require('../utils/validators');

function toPublicCategory(row) {
  return { id: row.id, userId: row.user_id, name: row.name, createdAt: row.created_at };
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function notFound(res) {
  return res.status(404).json({ error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found.' } });
}

function nameTaken(res) {
  return res.status(409).json({
    error: { code: 'CATEGORY_NAME_TAKEN', message: 'You already have a category with this name.' },
  });
}

async function create(req, res, next) {
  try {
    const { name } = req.body;
    const validationError = validateCategoryPayload({ name });
    if (validationError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: validationError } });
    }

    const result = await pool.query(
      'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.id, name.trim()]
    );
    return res.status(201).json({ category: toPublicCategory(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') return nameTaken(res);
    return next(err);
  }
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

async function update(req, res, next) {
  try {
    const categoryId = parseId(req.params.id);
    if (!categoryId) return notFound(res);

    const { name } = req.body;
    const validationError = validateCategoryPayload({ name });
    if (validationError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: validationError } });
    }

    const result = await pool.query(
      'UPDATE categories SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [name.trim(), categoryId, req.user.id]
    );
    if (!result.rows[0]) return notFound(res);
    return res.status(200).json({ category: toPublicCategory(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') return nameTaken(res);
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const categoryId = parseId(req.params.id);
    if (!categoryId) return notFound(res);

    const owned = await pool.query('SELECT id FROM categories WHERE id = $1 AND user_id = $2', [
      categoryId,
      req.user.id,
    ]);
    if (owned.rows.length === 0) return notFound(res);

    const inUse = await pool.query('SELECT 1 FROM tasks WHERE category_id = $1 LIMIT 1', [categoryId]);
    if (inUse.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'CATEGORY_IN_USE',
          message: 'This category still has tasks assigned to it. Reassign or delete those tasks first.',
        },
      });
    }

    const result = await pool.query('DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id', [
      categoryId,
      req.user.id,
    ]);
    if (result.rows.length === 0) return notFound(res);
    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: {
          code: 'CATEGORY_IN_USE',
          message: 'This category still has tasks assigned to it. Reassign or delete those tasks first.',
        },
      });
    }
    return next(err);
  }
}

module.exports = { create, list, update, remove };

const pool = require('../db/pool');
const { validateTaskPayload } = require('../utils/validators');

function toPublicTask(row) {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueDate: row.due_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function ownsCategory(categoryId, userId) {
  const result = await pool.query('SELECT id FROM categories WHERE id = $1 AND user_id = $2', [categoryId, userId]);
  return result.rows.length > 0;
}

async function create(req, res, next) {
  try {
    const { title, description, categoryId, priority, dueDate, status } = req.body;
    const validationError = validateTaskPayload({ title, description, categoryId, priority, dueDate, status });
    if (validationError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: validationError } });
    }
    if (!(await ownsCategory(categoryId, req.user.id))) {
      return res.status(400).json({ error: { code: 'INVALID_CATEGORY', message: 'Category not found.' } });
    }

    const result = await pool.query(
      `INSERT INTO tasks (user_id, category_id, title, description, priority, due_date, status)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'medium'), $6, $7)
       RETURNING *`,
      [req.user.id, categoryId, title.trim(), description ?? '', priority || null, dueDate || null, status]
    );
    return res.status(201).json({ task: toPublicTask(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    return res.status(200).json({ tasks: result.rows.map(toPublicTask) });
  } catch (err) {
    return next(err);
  }
}

function notFound(res) {
  return res.status(404).json({ error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' } });
}

async function getOne(req, res, next) {
  try {
    const taskId = parseId(req.params.id);
    if (!taskId) return notFound(res);
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [taskId, req.user.id]);
    if (!result.rows[0]) return notFound(res);
    return res.status(200).json({ task: toPublicTask(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const taskId = parseId(req.params.id);
    if (!taskId) return notFound(res);

    const { title, description, categoryId, priority, dueDate, status } = req.body;
    const validationError = validateTaskPayload({ title, description, categoryId, priority, dueDate, status });
    if (validationError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: validationError } });
    }
    if (!(await ownsCategory(categoryId, req.user.id))) {
      return res.status(400).json({ error: { code: 'INVALID_CATEGORY', message: 'Category not found.' } });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, category_id = $3, priority = COALESCE($4, 'medium'),
           due_date = $5, status = $6, updated_at = now()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [title.trim(), description ?? '', categoryId, priority || null, dueDate || null, status, taskId, req.user.id]
    );
    if (!result.rows[0]) return notFound(res);
    return res.status(200).json({ task: toPublicTask(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const taskId = parseId(req.params.id);
    if (!taskId) return notFound(res);
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id', [taskId, req.user.id]);
    if (result.rows.length === 0) return notFound(res);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, getOne, update, remove };

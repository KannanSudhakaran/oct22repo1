---
spec: _specs/03-create-edit-delete-tasks.md
branch: claude/feature/03-create-edit-delete-tasks
created: 2026-10-24
status: approved
---

# Implement: Create, Edit, and Delete Tasks (`_specs/03-create-edit-delete-tasks.md`)

## Context

`_specs/03-create-edit-delete-tasks.md` (PRD FR-02/03/06, business rules in Section 7) requires that a logged-in user can create, view, edit, and delete their own tasks, with every task tied to a category and isolated to its owner (FR-11). Today the only table is `users` (`server/src/db/schema.sql`), and `client/src/pages/WorkspacePage.jsx` is a placeholder ("Your tasks will live here in a future feature") — this is that feature.

Decisions made with the user before planning:
- **Categories**: Category management (FR-04) is out of scope for this spec, but a task must reference a category. Add a minimal `categories` table, seeded with three defaults (`Office`, `Personal`, `Financial`) per user at registration time. No create/edit/delete endpoints for categories yet — just a list endpoint so the task form has something to populate its dropdown with.
- **Scope**: Build both the backend REST API and a minimal frontend UI (task list + create/edit form + delete), mirroring how the existing auth feature (spec 01) shipped API + UI together.
- **Priority**: Low / Medium / High (3-level enum), matching the simplicity of the existing `role` CHECK-constraint style.

No `steps` table exists yet (FR-05 is a separate future spec) — delete in this spec is a single-row delete of the `tasks` row only.

## Database

### `server/src/db/schema.sql` (modify — append after `users`)

Table order matters: `pool.query(schema)` runs the whole file as one multi-statement string, and FK targets must already exist earlier in the file. Order: `users` → `categories` (FK → `users`) → `tasks` (FK → both).

```sql
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `user_id` FKs → `ON DELETE CASCADE` (consistent data model if a user row is ever removed; no such endpoint exists today — admins only deactivate).
- `category_id` → `ON DELETE RESTRICT`: inert today (no category-delete endpoint exists), but forces a future FR-04 spec to explicitly decide reassignment/cascade instead of silently orphaning tasks.
- Status values map to PRD's To Do / In Progress / Blocked / Done. A future `steps` table's own FK (`steps.task_id ... ON DELETE CASCADE`) is where cascade-on-task-delete will live — no changes needed to `tasks` to prepare for it.

### `server/src/db/migrate.js` (modify)
Update the log message only (e.g. `"Migration complete: users, categories, and tasks tables ready."`); the read-whole-file-and-run mechanism is unchanged. Note: this does not backfill categories for pre-existing users — acceptable since no real users exist yet in this classroom prototype.

## Seeding default categories at registration

### `server/src/controllers/auth.controller.js` (modify `register`)

Change the single insert into a transaction (checked-out client, `BEGIN`/`COMMIT`/`ROLLBACK`) so the user row and its three default categories are created atomically:

```js
async function register(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const validationError = validateCredentials(email, password);
    if (validationError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: validationError } });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const client = await pool.connect();
    let userRow;
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role',
        [email, passwordHash]
      );
      userRow = result.rows[0];
      await client.query(
        `INSERT INTO categories (user_id, name) VALUES ($1, 'Office'), ($1, 'Personal'), ($1, 'Financial')`,
        [userRow.id]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'Email is already registered.' } });
      }
      throw err;
    } finally {
      client.release();
    }

    const user = toPublicUser(userRow);
    const token = signToken(user);
    setAuthCookie(res, token);
    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
}
```

Any failure between `BEGIN` and `COMMIT` rolls back — no user row and no categories are left behind. The existing `23505` handling is preserved unchanged.

## Server routes/controllers

### `server/src/utils/validators.js` (modify — add task constants/helpers)

```js
const TASK_PRIORITIES = ['low', 'medium', 'high'];
const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done'];
const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;

function isValidPriority(value) {
  return TASK_PRIORITIES.includes(value);
}

function isValidStatus(value) {
  return TASK_STATUSES.includes(value);
}

function isValidDueDate(value) {
  if (value === null || value === undefined || value === '') return true; // optional
  return !Number.isNaN(new Date(value).getTime());
}

function validateTaskPayload({ title, description, categoryId, priority, dueDate, status }) {
  if (!isNonEmpty(title)) return 'Title is required.';
  if (title.trim().length > TITLE_MAX_LENGTH) return `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
  if (description != null && String(description).length > DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }
  if (categoryId === undefined || categoryId === null || !Number.isInteger(Number(categoryId))) {
    return 'Category is required.';
  }
  if (!isNonEmpty(status) || !isValidStatus(status)) {
    return 'Status must be one of: todo, in_progress, blocked, done.';
  }
  if (priority && !isValidPriority(priority)) {
    return 'Priority must be one of: low, medium, high.';
  }
  if (!isValidDueDate(dueDate)) {
    return 'Due date must be a valid date.';
  }
  return null;
}

module.exports = {
  normalizeEmail, isNonEmpty, validateCredentials,
  TASK_PRIORITIES, TASK_STATUSES, isValidPriority, isValidStatus, isValidDueDate, validateTaskPayload,
};
```

Required: `title`, `categoryId`, `status` (per FR-06). Optional: `description` (defaults `''`), `priority` (defaults `'medium'`), `dueDate` (nullable, no restriction on past dates per the spec's edge case). Length caps (title ≤200, description ≤2000) resolve the spec's open question about field constraints.

### `server/src/controllers/categories.controller.js` (new — list only)

```js
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
```

### `server/src/routes/categories.routes.js` (new)

```js
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { list } = require('../controllers/categories.controller');

const router = express.Router();
router.get('/', requireAuth, list);
module.exports = router;
```

### `server/src/controllers/tasks.controller.js` (new)

Response bodies use camelCase (mirroring `toPublicUser`), mapped from snake_case DB columns:

```js
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
```

Design points:
- `parseId` + early `TASK_NOT_FOUND` for a non-numeric `:id` avoids a Postgres type-cast error on a garbage path param reaching the generic 500 handler.
- Ownership is enforced via `WHERE user_id = $N` on every `SELECT`/`UPDATE`/`DELETE`. A nonexistent task and someone else's task both produce the identical `404 TASK_NOT_FOUND` — satisfies the spec's "don't leak existence" edge case.
- `INVALID_CATEGORY` (400, not 404) for a bad `categoryId` — it's a request-body validation failure, not a URL-addressed resource, and deliberately doesn't distinguish "doesn't exist" from "belongs to someone else" (same no-leak reasoning).
- `PUT` (not `PATCH`) chosen for update: the frontend edit form always submits the full editable field set, so full-resource replace lets `update` reuse the exact same `validateTaskPayload` as `create` — no second "which fields were sent" code path.

### `server/src/routes/tasks.routes.js` (new)

```js
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { create, list, getOne, update, remove } = require('../controllers/tasks.controller');

const router = express.Router();
router.use(requireAuth);
router.post('/', create);
router.get('/', list);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', remove);
module.exports = router;
```

### `server/src/index.js` (modify)

Add alongside existing requires/mounts (before `app.use(errorHandler)`):
```js
const tasksRoutes = require('./routes/tasks.routes');
const categoriesRoutes = require('./routes/categories.routes');
...
app.use('/api/tasks', tasksRoutes);
app.use('/api/categories', categoriesRoutes);
```

### Endpoint contract summary

| Method | Path | Auth | Success | Failure |
|---|---|---|---|---|
| POST | `/api/tasks` | required | `201 {task}` | `400 VALIDATION_ERROR` / `400 INVALID_CATEGORY` / `401 UNAUTHENTICATED` |
| GET | `/api/tasks` | required | `200 {tasks:[...]}` | `401 UNAUTHENTICATED` |
| GET | `/api/tasks/:id` | required | `200 {task}` | `404 TASK_NOT_FOUND` / `401` |
| PUT | `/api/tasks/:id` | required | `200 {task}` | `400 VALIDATION_ERROR` / `400 INVALID_CATEGORY` / `404 TASK_NOT_FOUND` / `401` |
| DELETE | `/api/tasks/:id` | required | `200 {ok:true}` | `404 TASK_NOT_FOUND` / `401` |
| GET | `/api/categories` | required | `200 {categories:[...]}` | `401 UNAUTHENTICATED` |

## Frontend

### `client/src/api/tasks.js` (new)

```js
import { apiFetch } from './client';

function listTasks() { return apiFetch('/tasks', { method: 'GET' }); }
function getTask(id) { return apiFetch(`/tasks/${id}`, { method: 'GET' }); }
function createTask(payload) { return apiFetch('/tasks', { method: 'POST', body: JSON.stringify(payload) }); }
function updateTask(id, payload) { return apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); }
function deleteTask(id) { return apiFetch(`/tasks/${id}`, { method: 'DELETE' }); }
function listCategories() { return apiFetch('/categories', { method: 'GET' }); }

export { listTasks, getTask, createTask, updateTask, deleteTask, listCategories };
```

### `client/src/components/TaskForm.jsx` (new)

Controlled form reused for both create and edit. Props: `{ categories, initialTask, onSubmit, onCancel, submitting }`. State seeded from `initialTask` in edit mode, or defaults (`priority: 'medium'`, `status: 'todo'`, `categoryId: categories[0]?.id`) in create mode. Hardcoded option lists matching the server enums exactly:
```js
const PRIORITY_OPTIONS = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }];
const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' }, { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' }, { value: 'done', label: 'Done' },
];
```
On submit builds `{ title, description, categoryId: Number(categoryId), priority, dueDate: dueDate || null, status }` and calls `onSubmit(payload)`. Renders: `<select>` for category (from `categories` prop), text inputs for title/description, `<input type="date">` for due date, `<select>`s for priority/status, Save + Cancel buttons (Cancel relevant in edit mode only). Reuses `.auth-form`-style input/label classes from `client/src/index.css`.

### `client/src/components/TaskList.jsx` (new)

Props: `{ tasks, categories, onEdit, onDelete }`. Renders each task's title, description, category name (looked up by `categoryId`), priority/status badges, due date, and Edit/Delete buttons calling `onEdit(task)` / `onDelete(task.id)`. Empty-state message when `tasks.length === 0`. Overdue highlighting is explicitly a dashboard concern (FR-08, out of scope per the spec's Non-Goals) and is intentionally not added here.

### `client/src/pages/WorkspacePage.jsx` (modify)

Replace the placeholder text with: load `tasks` + `categories` on mount (`Promise.all`); a "New Task" button toggling `<TaskForm>` into create mode; `editingTask` state (`null` = create, task object = edit) driving the same `<TaskForm>`; `<TaskList>` wired to `onEdit`/`onDelete`. Mutations update local state directly on success (create prepends, update replaces matching entry, delete filters it out) rather than refetching. Catch `ApiError` the same way `AuthPage.jsx` does and surface `err.message` via an `.auth-error`-style inline banner.

### `client/src/index.css` (modify)

Add, in the same flat/minimal visual language as existing `.auth-card`/`.navbar` rules: `.task-toolbar` (header row with "New Task" button), `.task-list`/`.task-card` (simple bordered rows), `.task-form` (reuses `.auth-form` input/label styling), `.badge--priority-{low,medium,high}` and `.badge--status-{todo,in_progress,blocked,done}` (small colored pills). No new design system.

## Design decisions resolving the spec's Open Questions

- **Delete confirmation**: UI-only (`window.confirm` before calling `deleteTask`), not enforced server-side — the API deletes unconditionally once called.
- **Field-length constraints**: title ≤200 chars, description ≤2000 chars — simple, low-friction defaults.
- **Hard vs. soft delete**: hard delete, per the spec's own stated assumption (no audit/history requirement in the PRD).

## FR / edge-case coverage

- FR-1–2 (create, owner set automatically) → `create` always inserts `req.user.id`, never a client-supplied user id.
- FR-3–4 (view/edit own fields) → `getOne`/`update`, ownership-scoped `WHERE`.
- FR-5/9 (delete removes task + associated data) → `remove`; single-row delete today since no child tables exist yet.
- FR-6 (required fields + category ownership) → `validateTaskPayload` + `ownsCategory`.
- FR-7 (deny access to non-owned tasks, no leak) → uniform `404 TASK_NOT_FOUND`.
- FR-8 (category must exist and belong to user) → `ownsCategory` on create/update, `400 INVALID_CATEGORY`.
- FR-10 (impersonation impossible) → `user_id` always from `req.user.id`, never from the request body.
- Edge cases (missing fields, invalid category, not-found vs. not-owned parity, past due dates allowed, invalid status/priority, unauthenticated rejection) → covered inline above.

## Out of scope — do not build here

Category create/edit/delete endpoints or UI (FR-04), steps (FR-05), progress calculation (FR-06), dedicated status-transition workflow (FR-07), dashboard/today's-and-overdue view (FR-08), filtering by category/status (FR-09), admin read-only task visibility (FR-10).

## Verification

1. `npm run db:migrate -w server` — confirm `categories` and `tasks` tables now exist alongside `users`.
2. Register a new account (Account A) → `SELECT * FROM categories WHERE user_id = <A.id>` shows exactly `Office`, `Personal`, `Financial`.
3. On `/workspace`, confirm the task list starts empty and the "New Task" form's category dropdown has those three categories.
4. Create a task with every field filled (including a due date in the past) → appears in the list immediately; reload the page → still present.
5. Submit the create form with title blank → `400 VALIDATION_ERROR`, no row inserted.
6. Submit with an invalid/omitted status → `400 VALIDATION_ERROR`.
7. Edit an existing task (change title, status to Done, priority to High) → list reflects updated values after save.
8. Delete a task → disappears from the list; confirm the row is gone in Postgres.
9. Register a second account (Account B). As B, call `GET/PUT/DELETE /api/tasks/:id` against one of A's task IDs → `404 TASK_NOT_FOUND` in all three cases, A's task unchanged.
10. As B, attempt to create/edit a task using one of A's category IDs → `400 INVALID_CATEGORY`, no row created/changed.
11. Log out (clear the `token` cookie) and call each task/category endpoint with no cookie → `401 UNAUTHENTICATED`.
12. Spot-check response shapes: `POST` success → `201 {task:{...}}`; list endpoints → `200 {tasks:[...]}` / `{categories:[...]}`; `DELETE` success → `200 {ok:true}`; every failure → `{error:{code,message}}`.

### Critical files
- `server/src/db/schema.sql`, `server/src/db/migrate.js`
- `server/src/controllers/auth.controller.js` (transactional register change)
- `server/src/utils/validators.js`
- `server/src/controllers/tasks.controller.js`, `server/src/routes/tasks.routes.js` (new)
- `server/src/controllers/categories.controller.js`, `server/src/routes/categories.routes.js` (new)
- `server/src/index.js` (mount new routes)
- `client/src/api/tasks.js` (new)
- `client/src/components/TaskForm.jsx`, `client/src/components/TaskList.jsx` (new)
- `client/src/pages/WorkspacePage.jsx`
- `client/src/index.css`

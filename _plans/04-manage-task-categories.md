---
spec: _specs/04-manage-task-categories.md
branch: claude/feature/04-manage-task-categories
created: 2026-10-24
status: approved
---

# Plan: Manage Task Categories (Create, Rename, Delete)

## Context

`_specs/04-manage-task-categories.md` (PRD FR-04) requires that users can create and manage their own task categories, with the same per-user isolation (FR-11) already enforced on tasks. The sibling "tasks CRUD" feature just shipped and already stubbed out a **list-only** categories endpoint (`GET /api/categories`) purely so `TaskForm`'s category `<select>` had data — create/rename/delete were never built. This plan fills that gap, deliberately mirroring the tasks feature's exact backend and frontend conventions rather than inventing new ones, and resolves the spec's two open questions:

- **Delete-in-use policy**: reject the delete with a clear error (confirmed with user) — matches the existing `tasks.category_id … ON DELETE RESTRICT` FK, no schema change needed.
- **UI placement**: inline section in `WorkspacePage.jsx` (confirmed with user) — no new route, no modal, reusing existing CSS.

All file/line references below were verified by reading the actual files.

## Backend

### `server/src/utils/validators.js`
Add alongside the `TASK_*` block:
- `CATEGORY_NAME_MAX_LENGTH = 100`
- `validateCategoryPayload({ name })` — same shape as `validateTaskPayload` (line 34): `'Name is required.'` if `!isNonEmpty(name)`; length-exceeded message if `name.trim().length > CATEGORY_NAME_MAX_LENGTH`; else `null`.
- Export both from `module.exports` (line 55).

### `server/src/controllers/categories.controller.js`
Currently only `list` (lines 7-17, scoped `WHERE user_id = $1`). Add, following `tasks.controller.js`'s structure exactly:
- `parseId(value)` — copy of `tasks.controller.js:19-22`.
- `notFound(res)` → `404 { error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found.' } }` (mirrors `tasks.controller.js:61-63`).
- `create(req, res, next)`: validate `name` via `validateCategoryPayload`; `400 VALIDATION_ERROR` on failure (mirrors `tasks.controller.js:32-35`). `INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING *` with `req.user.id`, `name.trim()`. Catch `err.code === '23505'` → `409 { error: { code: 'CATEGORY_NAME_TAKEN', message: 'You already have a category with this name.' } }` (the `UNIQUE(user_id, name)` constraint already exists at `schema.sql:15`). Success → `201 { category }`.
- `update(req, res, next)` (rename): `parseId(req.params.id)` → `notFound()` if invalid. Validate `name`. `UPDATE categories SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *` — zero rows (nonexistent OR owned by another user, same no-leak pattern as `tasks.controller.js:99`) → `notFound()`. Catch `23505` → `409 CATEGORY_NAME_TAKEN`. Success → `200 { category }`.
- `remove(req, res, next)`: `parseId` → `notFound()` if invalid. Then, **in this order** (ownership check before in-use check, so a non-owner always gets 404, never a 409 that would leak existence):
  1. `SELECT id FROM categories WHERE id = $1 AND user_id = $2` — no row → `notFound()`.
  2. `SELECT 1 FROM tasks WHERE category_id = $1 LIMIT 1` — any row → `409 { error: { code: 'CATEGORY_IN_USE', message: 'This category still has tasks assigned to it. Reassign or delete those tasks first.' } }`.
  3. `DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id`; catch `23503` as defense-in-depth → same `409 CATEGORY_IN_USE`.
  4. Success → `200 { ok: true }` (matches `tasks.controller.js:112`, not 204).
- No `getOne` needed — nothing reads a single category by id outside update/delete.
- `module.exports = { create, list, update, remove }`.

### `server/src/routes/categories.routes.js`
Currently only `router.get('/', requireAuth, list)`. Replace with the `tasks.routes.js` pattern:
```
router.use(requireAuth);
router.post('/', create);
router.get('/', list);
router.put('/:id', update);
router.delete('/:id', remove);
```
`server/src/index.js` already mounts `/api/categories` — no change there.

### Endpoint contract
| Method | Path | Success | Failure |
|---|---|---|---|
| POST | `/api/categories` | `201 {category}` | `400 VALIDATION_ERROR` / `409 CATEGORY_NAME_TAKEN` / `401` |
| GET | `/api/categories` | `200 {categories:[...]}` (unchanged) | `401` |
| PUT | `/api/categories/:id` | `200 {category}` | `400 VALIDATION_ERROR` / `404 CATEGORY_NOT_FOUND` / `409 CATEGORY_NAME_TAKEN` / `401` |
| DELETE | `/api/categories/:id` | `200 {ok:true}` | `404 CATEGORY_NOT_FOUND` / `409 CATEGORY_IN_USE` / `401` |

No `schema.sql` / `migrate.js` changes.

## Frontend

### `client/src/api/categories.js` (new)
Move `listCategories` out of `client/src/api/tasks.js:8` into this new file; add the three mutations as thin `apiFetch` wrappers (same style as `tasks.js:3-7`):
`listCategories`, `createCategory(payload)` (POST `/categories`), `updateCategory(id, payload)` (PUT `/categories/${id}`), `deleteCategory(id)` (DELETE `/categories/${id}`).

### `client/src/api/tasks.js`
Remove `listCategories` (line 8) and its export — this file becomes task-only.

### New components, mirroring `TaskForm.jsx` / `TaskList.jsx` 1:1
- `client/src/components/CategoryForm.jsx`: props `{ initialCategory, onSubmit, onCancel, submitting }`; `isEdit = Boolean(initialCategory)`; single controlled `name` field seeded from `initialCategory?.name ?? ''`; `handleSubmit` calls `onSubmit({ name })`; `className="task-form auth-form"`, Save/Cancel via `.task-form__actions`/`.task-form__cancel` (same classes as `TaskForm.jsx`).
- `client/src/components/CategoryList.jsx`: props `{ categories, onEdit, onDelete }`; empty-state message via `.task-list__empty`; `<ul className="task-list">` of `<li className="task-card">` rows, name in `.task-card__main`, Edit/Delete buttons in `.task-card__actions` (`onEdit(category)` / `onDelete(category.id)`), delete button using `.task-card__delete`.

### `client/src/pages/WorkspacePage.jsx`
- Swap the `../api/tasks` import (drop `listCategories`) for a new `../api/categories` import of `listCategories, createCategory, updateCategory, deleteCategory`; import `CategoryForm`, `CategoryList`.
- New state: `showCategoryForm`, `editingCategory` (null = create), `categorySubmitting`. Reuse the existing `error`/`setError` banner (no new UI chrome).
- New handlers mirroring the existing task ones 1:1: `openCreateCategoryForm`/`openEditCategoryForm`/`closeCategoryForm` (mirror lines 34-49); `handleCategorySubmit(payload)` branching on `editingCategory` for update vs. create, updating `categories` state immutably, catching `ApiError` into `error` (mirror lines 51-68); `handleCategoryDelete(categoryId)` with `window.confirm`, calling `deleteCategory`, filtering state on success, surfacing `err.message` (notably `CATEGORY_IN_USE`) on failure (mirror lines 70-79).
- **Edge case**: the backend already prevents deleting a category used by any existing task, so an *open task edit form* can never be left pointing at a just-deleted category. The only residual case is the **create**-task form being open (fresh `categoryId` default) when its category is deleted via the new manager before submission. Mitigation: in `handleCategoryDelete`, after a successful delete, if `showForm` is true call `closeForm()` defensively.
- Render: add a second `.task-toolbar` section ("Your Categories" + New/Cancel toggle) above the existing "Your Tasks" toolbar (categories are a prerequisite for tasks), followed conditionally by `<CategoryForm>` and then `<CategoryList categories={categories} onEdit={openEditCategoryForm} onDelete={handleCategoryDelete} />`.

## Styling

No new CSS. Reuse `.task-toolbar`, `.task-form`/`.auth-form` (+ `.task-form__actions`/`.task-form__cancel`), `.task-list`/`.task-list__empty`, `.task-card` + `__main`/`__actions`/`__delete`, `.auth-error` — all already in `client/src/index.css`.

## Verification

No automated test suite exists in this repo. Manual verification only:

1. `npm run db:migrate` (idempotent, confirms no schema drift) → start server and client dev servers.
2. Register/log in as User A → confirm categories list renders in the new inline section.
3. Create category "Groceries" → appears immediately; duplicate-name create → `409 CATEGORY_NAME_TAKEN`, no extra row.
4. Rename "Groceries" → "Household"; rename to an existing name (e.g. "Office") → `409 CATEGORY_NAME_TAKEN`.
5. Create/edit a task using "Household", then attempt to delete "Household" → `409 CATEGORY_IN_USE`; category and task unaffected.
6. Delete that task, then delete "Household" → `200 {ok:true}`, disappears from category list and the task form's dropdown.
7. Submit create/rename with an empty name → `400 VALIDATION_ERROR`.
8. Cross-user isolation: as User B (via curl/Postman with B's session cookie), `PUT`/`DELETE /api/categories/:id` against one of A's category IDs → `404 CATEGORY_NOT_FOUND` both times; A's category unchanged and absent from B's `GET /api/categories`.
9. Clear the auth cookie and hit any category endpoint → `401 UNAUTHENTICATED`.
10. Spot-check response shapes: create `201 {category}`, rename `200 {category}`, delete `200 {ok:true}`, list `200 {categories:[...]}`, every error `{error:{code,message}}`.

### Critical files
- `server/src/controllers/categories.controller.js`
- `server/src/routes/categories.routes.js`
- `server/src/utils/validators.js`
- `client/src/api/categories.js` (new)
- `client/src/api/tasks.js`
- `client/src/pages/WorkspacePage.jsx`
- `client/src/components/CategoryForm.jsx` (new)
- `client/src/components/CategoryList.jsx` (new)

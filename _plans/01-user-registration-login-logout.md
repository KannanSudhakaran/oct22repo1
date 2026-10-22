---
spec: _specs/01-user-registration-login-logout.md
branch: claude/feature/user-registration-login-logout
created: 2026-10-22
status: approved
---

# Implement: User Registration, Login, Logout (_specs/01-user-registration-login-logout.md)

## Context

The repo is currently empty of application code — only `PRD.md`, `CLAUDE.md`, and the spec exist. This is the **first feature** of TaskFlow and the foundation every other feature (tasks, categories, steps, dashboard) depends on for identifying "whose data is this" (FR-11 isolation). The spec deliberately leaves implementation details (DB, session mechanism, language, repo layout) open; those were resolved with the user as follows:

- **Database:** PostgreSQL
- **Session mechanism:** JWT in an httpOnly cookie (stateless, no session store)
- **Identifying credential:** email
- **Password rules:** non-empty only (no complexity requirement), but hashed with bcrypt for storage
- **Language:** plain JavaScript (no TypeScript)
- **Repo layout:** monorepo — `/client` (React) and `/server` (Express), npm workspaces from a root `package.json`

The goal of this plan is to scaffold the whole app from nothing and implement exactly this one feature end-to-end, with every FR (1–17) and edge case in the spec mapped to a concrete piece of code — without building anything from later specs (tasks, categories, admin UI, password reset, etc.).

## Scaffolding

**Root `package.json`** — npm workspaces `["server", "client"]`, with `dev:server`, `dev:client`, `db:migrate` scripts.

**`/server`** (Express, plain JS):
- Deps: `express`, `pg` (raw driver + parameterized queries — no ORM/query-builder; one table and a handful of queries doesn't justify Knex/Prisma), `bcrypt`, `jsonwebtoken`, `cookie-parser`, `cors`, `dotenv`; dev dep `nodemon`.
- `.env` — `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN=1d`, `NODE_ENV`, `PORT=4000`, `CLIENT_ORIGIN=http://localhost:5173` (plus a committed `.env.example`).

**`/client`** (React, plain JS):
- Scaffolded via Vite's `react` template (not `react-ts`).
- Deps: `react-router-dom`. No extra state library — React context + `fetch` is enough for this scope.

## Database

`/server/src/db/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- Email normalized (`trim().toLowerCase()`) before storage/lookup. `UNIQUE` constraint is the authoritative duplicate guard, including under concurrent double-submit (first-committer-wins; loser gets Postgres error `23505`).
- `role` column exists for future specs (admin flows) but this feature never writes `'admin'`.
- `/server/src/db/migrate.js` reads and runs `schema.sql` via a shared `pg.Pool` (`/server/src/db/pool.js`); run manually once via `npm run db:migrate -w server`, not on every boot.

## Server structure

```
server/src/
  index.js                  # app bootstrap: cors, cookie-parser, json, routes, error handler, listen
  db/{pool.js, schema.sql, migrate.js}
  routes/auth.routes.js      # mounts /api/auth/*
  controllers/auth.controller.js
  middleware/{requireAuth.js, errorHandler.js}
  utils/{validators.js, jwt.js}
```

**Endpoints:**
- `POST /api/auth/register` — body `{email, password}`. Validates non-empty fields (400 `VALIDATION_ERROR` otherwise), hashes password with bcrypt, inserts user (`role='user'`, `is_active=true`). Unique violation → `409 EMAIL_IN_USE`. On success, issues JWT + sets cookie (same as login) and returns `201 {user:{id,email,role}}` — never returns `password_hash`.
- `POST /api/auth/login` — body `{email, password}`. Missing fields → `400`. User not found OR bad password → identical `401 INVALID_CREDENTIALS` (no leak of which was wrong — FR-8). Found + correct password but `is_active=false` → `403 ACCOUNT_DEACTIVATED`, checked **after** password match so a wrong-password attempt on a deactivated account still gets the generic message. Success → sets cookie, `200 {user:{...}}`.
- `POST /api/auth/logout` — clears the cookie, `200`. Idempotent (clearing an absent cookie is a no-op).
- `GET /api/auth/me` — protected by `requireAuth`; returns `200 {user}` or `401 UNAUTHENTICATED`. Used by the client to detect an existing session on load.

**JWT & cookie:** payload `{sub: user.id, role, iat, exp}` only (no email — minimizes what the token exposes). Cookie name `token`, `httpOnly: true`, `sameSite: 'lax'`, `secure: NODE_ENV==='production'`, `maxAge` matching `JWT_EXPIRES_IN`.

**`requireAuth` middleware:** reads `req.cookies.token`, verifies it, sets `req.user = {id, role}` or responds `401`. This is the single enforcement point for FR-15/16 and will be reused unchanged by every future protected route (tasks, categories, steps).

**CORS:** `cors({origin: CLIENT_ORIGIN, credentials: true})`; client fetches use `credentials: 'include'`.

**Double-submit reasoning:** register race is handled by the DB unique constraint; login/logout are stateless and idempotent, so no server-side de-dup logic is needed beyond disabling the submit button client-side during the in-flight request.

## Client structure

```
client/src/
  main.jsx                  # AuthProvider + BrowserRouter
  App.jsx                   # route table
  api/{client.js, auth.js}  # fetch wrapper + register/login/logout/fetchMe calls
  context/AuthContext.jsx   # useAuth(): {user, status: loading|authenticated|anonymous, login, register, logout}
  components/{ProtectedRoute.jsx, NavBar.jsx}
  pages/{AuthPage.jsx, WorkspacePage.jsx, NotFoundPage.jsx}
```

- **`AuthContext`** calls `GET /api/auth/me` once on mount to establish session state (`loading` while pending, to avoid redirect flicker).
- **`AuthPage`** (route `/login`) — single screen toggling Login/Register forms, matching PRD's single "Login and Registration" screen. Redirects to `/workspace` immediately if already authenticated (FR-11). Renders the server's distinct error messages (`INVALID_CREDENTIALS` vs `ACCOUNT_DEACTIVATED` vs `VALIDATION_ERROR`/`EMAIL_IN_USE`).
- **`ProtectedRoute`** — renders children if authenticated, redirects to `/login` if anonymous (FR-16), shows a lightweight placeholder while `loading`.
- **`WorkspacePage`** — bare placeholder post-login destination (no task UI — out of scope); hosts `NavBar` with the user's email and a **Logout** button (FR-12/14, navigates to `/login` after clearing session).
- Routes: `/login` (public), `/workspace` (protected), `/` → redirect to `/workspace`, `*` → not-found.

## FR / edge-case coverage

Every FR (1–17) and every edge case in the spec maps directly onto the pieces above:
- FR-1–6 (registration + hashing) → register endpoint + validators + bcrypt.
- FR-7–9 (login, generic invalid-credentials, distinct deactivated message) → login endpoint's two-stage check.
- FR-10, FR-17 (session scoped to one identity, nothing selectable) → JWT `sub` as sole identity carrier, `requireAuth` as sole source of `req.user`.
- FR-11 → `AuthContext` + `AuthPage` redirect-if-authenticated.
- FR-12–14 (logout) → `/api/auth/logout` + `NavBar` + client-side navigate.
- FR-15–16 (session boundaries) → `requireAuth` + `ProtectedRoute`.
- Edge cases (duplicate email, missing fields, bad credentials, deactivated login, no/ended session, rapid double-submit) → covered inline above.

## Out of scope — do not build

Password reset/forgot-password, email verification/MFA, social login, admin registration/login/dashboard UI (only the `role`/`is_active` columns + login-time check exist), profile editing, Task/Category/Step schemas or screens, server-side session store/token revocation, rate limiting on login.

## Verification

Manual end-to-end pass after scaffolding:
1. `npm run db:migrate -w server`, confirm `users` table exists.
2. Run server + client; visiting `/` redirects to `/login`.
3. Register a new account → lands on `/workspace` with session persisting across refresh.
4. Visiting `/login` while authenticated bounces back to `/workspace` (FR-11).
5. Logout → back to `/login`; manually navigating to `/workspace` redirects to `/login` (FR-16).
6. Re-login with same credentials succeeds.
7. Duplicate-email registration → `EMAIL_IN_USE` error, no new row.
8. Empty-password registration → validation error, no row.
9. Wrong password vs. non-existent email at login → byte-identical generic "invalid credentials" response.
10. `UPDATE users SET is_active=false ...` directly in Postgres, then attempt login with correct credentials → distinct "account deactivated" message, no cookie set.
11. Inspect cookie in devtools: `HttpOnly` set, `SameSite=Lax`.

Optional (not required for this pass): a `supertest`-based server test file covering the same scenarios, if the user wants automated coverage later.

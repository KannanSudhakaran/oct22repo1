---
spec: _specs/02-health-check-endpoint.md
branch: claude/feature/02-health-check-endpoint
created: 2026-10-22
status: approved
---

# Plan: Health Check Endpoint (_specs/02-health-check-endpoint.md)

## Context
`_specs/02-health-check-endpoint.md` (and the matching PRD.md Section 8 "Monitoring" bullet) call for an unauthenticated `GET` endpoint that reports whether the API process is up and whether its database dependency is reachable, so deployment platforms (e.g. Vercel) and uptime monitors can verify the service is healthy. Nothing has been implemented yet — confirmed via repo-wide search for "health"/"ping"/"status", which only turns up the spec and PRD references. This plan adds that endpoint following the server's existing route/controller conventions.

## Current conventions (from `server/src/`)
- Routing pattern: `routes/*.routes.js` defines an `express.Router()` and delegates to `controllers/*.controller.js` (see `server/src/routes/auth.routes.js` + `server/src/controllers/auth.controller.js`). Routes are mounted in `server/src/index.js:14` via `app.use('/api/auth', authRoutes)`, before `app.use(errorHandler)` on line 16.
- DB access: `server/src/db/pool.js` exports a raw `pg` `Pool` (`new Pool({ connectionString: process.env.DATABASE_URL })`); callers do `pool.query(sql, params)` → `{ rows }`. No existing connectivity-check/`SELECT 1` anywhere — this will be new.
- Response shape: success responses are small plain objects (e.g. `{ user }`, or `{ ok: true }` for `logout` in `auth.controller.js:89`); errors use `{ error: { code, message } }`. A health response isn't really an "error" case, so it gets its own small top-level shape (see below) rather than the error wrapper.
- No test framework is installed (`server/package.json` has no `test` script, no jest/mocha/supertest, no `*.test.js` files anywhere) — verification will be manual (curl/local run), not an automated test suite.
- No `vercel.json` exists anywhere in the repo, so there's no serverless rewrite/catch-all to account for — the route mounts in `index.js` exactly like `authRoutes`.

## Implementation

**1. `server/src/controllers/health.controller.js` (new)**
- Export a single `health(req, res)` handler.
- Run `await pool.query('SELECT 1')` against the existing `pool` from `server/src/db/pool.js`.
- Wrap the query in a short timeout (e.g. `Promise.race` against a 2s timer) so a slow/hanging DB can't hang the request — satisfies the spec's "must not hang indefinitely" edge case, since the `pg` pool has no query timeout configured today.
- On success: respond `200` with `{ status: 'ok', db: 'ok' }`.
- On failure (query throws, or the timeout wins): respond `503` with `{ status: 'degraded', db: 'error' }`. Never throw/call `next(err)` — this endpoint must always return a response, never trigger the generic error handler.
- No auth, no request body/query parsing — ignores any extraneous input per the spec's edge case.

**2. `server/src/routes/health.routes.js` (new)**
- `express.Router()` with a single `router.get('/', health)`, mirroring `auth.routes.js`'s structure exactly (no `requireAuth` middleware, since this must stay unauthenticated).

**3. `server/src/index.js` (modify)**
- Add `const healthRoutes = require('./routes/health.routes');` alongside the existing `authRoutes` require (line 5).
- Add `app.use('/api/health', healthRoutes);` alongside line 14, before `app.use(errorHandler)`.
- Mount it before or after `/api/auth` — order doesn't matter since paths don't overlap.

## Design decisions (resolving the spec's open questions)
- Single combined health response (not separate liveness/readiness endpoints) — simplest option that still satisfies every acceptance criterion in the spec; appropriate for a classroom prototype.
- Only dependency checked is the database (the only dependency that exists today per `.env.example`); no other external services to check.
- No special-casing of request logging for this endpoint — out of scope, nothing in the current codebase does structured request logging to begin with.

## Verification
- Start the server locally (`npm run dev` in `server/`, with a working `DATABASE_URL`) and `curl http://localhost:4000/api/health` — expect `200 { "status": "ok", "db": "ok" }`.
- Stop/break the DB connection (e.g. point `DATABASE_URL` at an unreachable host) and repeat — expect `503 { "status": "degraded", "db": "error" }`, returned promptly (not hanging past the timeout).
- Confirm no cookie/auth header is required (plain `curl` with no credentials works).
- Confirm the call has no side effects — no rows written, no session/cookie set in the response.

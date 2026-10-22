# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repository currently contains no application code — only `PRD.md` (the product requirements document) and a custom `/spec` slash command. There is no build, lint, or test tooling yet, and no package manifest. Do not assume a framework-specific command set exists until the corresponding scaffolding has been created.

## What this project is

TaskFlow is a planned classroom-prototype full-stack todo app, specified in `PRD.md`:

- **Stack (per PRD):** React frontend, Node.js + Express backend, PostgreSQL or SQLite, REST/JSON API, login-based auth.
- **Core domain:** Users own Tasks; each Task belongs to one Category and can have multiple Steps; task progress is derived from completed steps (not stored directly); task status is one of To Do / In Progress / Blocked / Done.
- **Roles:** `User` (full CRUD on their own tasks/categories/steps) and `Administrator` (read-only visibility into all users' tasks, plus the ability to activate/deactivate accounts — admins can never modify task data).
- **Hard isolation rule:** a user must never be able to view or modify another user's tasks (see PRD FR-11) — this constraint should drive authorization checks on every task/category/step endpoint.

Read `PRD.md` in full before implementing any feature — it is the single source of truth for scope, and explicitly excludes notifications, recurring tasks, mobile apps, payments, and collaboration features.

## Feature spec workflow

This repo uses a custom `/spec` command (`.claude/commands/spec.md`) to turn a short feature idea into a numbered spec file plus a dedicated branch, instead of planning features ad hoc:

- Specs are saved to `_specs/<NN>-<feature-slug>.md` (zero-padded sequence number), based on `_specs/template.md`.
- Each spec gets its own branch named `claude/feature/<feature-slug>` (auto-suffixed `-01`, `-02`, … on collision).
- The command refuses to run if the working tree has uncommitted/unstaged/untracked changes — commit or stash first.
- Spec files describe behavior/requirements only, no implementation code.

When asked to plan a new feature for this project, prefer invoking `/spec` over writing a plan directly into chat, so the spec is persisted and tied to its own branch.

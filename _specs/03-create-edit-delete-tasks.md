# Feature Spec: Create, Edit, and Delete Tasks

## Summary

Allow a logged-in `User` to create new personal tasks, edit the details of their existing tasks, and delete tasks they no longer need. This is the core task-ownership capability of TaskFlow: every other task-related feature (steps, progress tracking, status changes, dashboard, filtering) depends on users first being able to create and maintain their own tasks.

## Background / Context

Per `PRD.md` Section 5, FR-02: "Users can create, edit and delete their own tasks." Per FR-03, each task has a title, description, category, priority, due date, and status. Per Section 7 (Business Rules), every task belongs to one user, a task belongs to one category, and users can access only their own tasks (FR-11). This spec covers the fundamental create/edit/delete lifecycle for a task's own fields. It does not cover managing steps within a task, changing a task's status specifically, category management, or dashboard/filtering views — those are separate concerns covered elsewhere in the PRD.

## Goals

- A logged-in user can create a new task with the fields defined in the PRD (title, description, category, priority, due date, status).
- A logged-in user can view, edit, and update the fields of a task they own.
- A logged-in user can delete a task they own.
- A user can only create, edit, or delete tasks that belong to them — never another user's tasks.
- Task data remains consistent and valid after create/edit operations (e.g. required fields are present, referenced category exists and belongs to the user).

## Non-Goals

- Managing steps within a task (adding, editing, deleting, completing steps) — covered by a separate spec (FR-05).
- Calculating or displaying task progress from completed steps (FR-06).
- Changing task status as a dedicated workflow/transition feature (FR-07) — status is treated here only as one of the task's editable fields.
- Category creation/management (FR-04) — this spec assumes categories already exist and a task simply references one.
- Dashboard display of today's/overdue tasks (FR-08) or filtering by category/status (FR-09).
- Administrator read-only visibility into tasks (FR-10) — this spec is about the owning user's own CRUD actions.
- Notifications, recurring tasks, mobile apps, payments, and collaboration features (explicitly out of scope per `PRD.md` Section 11).

## User Roles & Permissions

- **User**: can create a new task for themselves; can view, edit, and delete only tasks they own. Cannot create a task on behalf of another user, and cannot view, edit, or delete another user's task under any circumstance.
- **Administrator**: not covered by this spec. Per the PRD, administrators have read-only visibility into all users' tasks and can never modify task data — this spec's create/edit/delete actions are not available to the Administrator role.

## Functional Requirements

1. A logged-in user can create a new task by providing: title, description, category, priority, due date, and status.
2. A newly created task is automatically associated with the logged-in user as its owner; ownership cannot be set or changed by the user to point at another account.
3. A logged-in user can retrieve the details of a task they own in order to view or edit it.
4. A logged-in user can edit any of a task's fields (title, description, category, priority, due date, status) on a task they own.
5. A logged-in user can delete a task they own, including any steps that belong to that task.
6. Every create or edit operation must validate that required fields (at minimum: title, category, status) are present and that the category referenced belongs to the same user.
7. A user attempting to view, edit, or delete a task they do not own must be denied, regardless of how the task is referenced (e.g. by ID in a request) — this enforces PRD FR-11's isolation rule.
8. A user attempting to assign a task to a category that does not exist, or that belongs to a different user, must be rejected.
9. Deleting a task is a permanent removal of that task and its associated data (e.g. steps); it is not a reversible "soft delete" unless otherwise specified.
10. Creating or editing a task must not allow the user to impersonate another user or alter another user's tasks as a side effect.

## Edge Cases & Error Handling

- Creating a task with a missing required field (e.g. no title, no category, no status) must be rejected with a clear indication of what is missing.
- Creating or editing a task with a category ID that does not exist, or that belongs to another user, must be rejected.
- Editing or deleting a task ID that does not exist must be rejected with a clear "not found" style response rather than silently succeeding.
- Editing or deleting a task that exists but belongs to a different user must be rejected the same way regardless of whether the task exists (should not leak whether the task ID is valid for another account).
- Submitting a due date in the past should be allowed (e.g. a user logging a task retroactively or recording something now overdue), since overdue tasks are an expected, visually-highlighted state per the PRD — this spec does not impose date restrictions.
- Submitting an invalid or unrecognized value for priority or status (outside the defined set: To Do, In Progress, Blocked, Done) must be rejected.
- Deleting a task that has steps and/or recorded progress must also remove or invalidate that associated data so no orphaned records referencing a deleted task remain.
- Concurrent edits to the same task (e.g. two browser tabs) should not corrupt the task; the last successful write should reflect the stored state, consistent with typical PRD-scope prototype behavior.
- A logged-out (unauthenticated) request to create, edit, or delete a task must be rejected.

## Acceptance Criteria

- [ ] A logged-in user can create a task with title, description, category, priority, due date, and status, and the task is saved as owned by that user.
- [ ] A logged-in user can view and edit the fields of a task they own, and the updated values are persisted.
- [ ] A logged-in user can delete a task they own, and it no longer appears in their task list afterward.
- [ ] A logged-in user cannot view, edit, or delete a task owned by a different user, under any request shape.
- [ ] Creating or editing a task with a missing required field or an invalid category/status/priority value is rejected with a clear error.
- [ ] Deleting a task also removes any steps or progress data associated with that task, leaving no orphaned records.
- [ ] Unauthenticated requests to create, edit, or delete a task are rejected.

## Open Questions

- Should deleting a task require a confirmation step at the API level, or is confirmation purely a frontend UX concern outside this spec's scope?
- Are there any field-level constraints beyond "required" (e.g. a maximum title/description length) expected for this classroom prototype?
- Should task deletion be a hard delete, or should the PRD's prototype scope prefer a soft-delete/archive approach for any future audit needs? (PRD does not mention audit/history requirements, so this spec assumes hard delete.)

## Out of Scope (reiterated from PRD)

- Notifications, recurring tasks, mobile apps, payments, and collaboration features remain out of scope per `PRD.md` Section 11, and are not affected by this spec.

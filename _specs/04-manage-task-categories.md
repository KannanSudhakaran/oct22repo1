# Feature Spec: Manage Task Categories

## Summary

Allow a logged-in `User` to create, view, rename, and delete their own task categories (e.g. Office, Personal, Financial). Categories are the organizational grouping that every task belongs to, so this capability is a prerequisite for assigning and filtering tasks by category elsewhere in TaskFlow.

## Background / Context

Per `PRD.md` Section 5, FR-04: "Users can create and manage task categories." Per FR-03, each task has a category among its fields, and per Section 7 (Business Rules), each task belongs to exactly one category. Per FR-11, users cannot view or modify other users' data, which applies to categories as well as tasks. This spec covers the category lifecycle itself (create, view, rename, delete) as a standalone capability. It does not cover assigning a category to a task (covered by the task create/edit spec), filtering tasks by category (FR-09), or administrator visibility into categories.

## Goals

- A logged-in user can create a new category with a name.
- A logged-in user can view the list of categories they have created.
- A logged-in user can rename a category they own.
- A logged-in user can delete a category they own.
- A user can only create, view, rename, or delete their own categories — never another user's categories.
- Category data remains consistent after tasks reference it (e.g. deleting a category that is still in use is handled predictably).

## Non-Goals

- Creating or editing a task's own fields, including assigning it to a category (FR-02/FR-03) — this spec assumes a category already exists and is simply referenced by a task.
- Filtering tasks by category or status (FR-09).
- Dashboard display of tasks grouped by category (FR-08).
- Administrator read-only visibility into any user's categories or tasks (FR-10) — administrators can never modify category or task data.
- Shared or system-wide default categories — per the PRD, categories belong to the individual user who created them.
- Notifications, recurring tasks, mobile apps, payments, and collaboration features (explicitly out of scope per `PRD.md` Section 11).

## User Roles & Permissions

- **User**: can create a new category for themselves; can view, rename, and delete only categories they own. Cannot create a category on behalf of another user, and cannot view, rename, or delete another user's category under any circumstance.
- **Administrator**: not covered by this spec. Per the PRD, administrators have read-only visibility into all users' tasks and can never modify task data; this spec's create/rename/delete actions for categories are not available to the Administrator role.

## Functional Requirements

1. A logged-in user can create a new category by providing a name.
2. A newly created category is automatically associated with the logged-in user as its owner; ownership cannot be set or changed by the user to point at another account.
3. A logged-in user can retrieve the list of categories they own.
4. A logged-in user can rename a category they own.
5. A logged-in user can delete a category they own.
6. Every create or rename operation must validate that the category name is present and non-empty.
7. A user attempting to view, rename, or delete a category they do not own must be denied, regardless of how the category is referenced (e.g. by ID in a request) — this enforces PRD FR-11's isolation rule.
8. A user cannot create two categories with the same name for themselves (duplicate names for a single user are rejected or otherwise prevented); different users may use the same category name independently.
9. Deleting a category that is still referenced by one or more of that user's tasks must be handled predictably (e.g. rejected until tasks are reassigned, or tasks are reassigned/cleared as part of deletion) — the exact behavior should be confirmed, see Open Questions.
10. Creating, renaming, or deleting a category must not allow the user to impersonate another user or alter another user's categories as a side effect.

## Edge Cases & Error Handling

- Creating or renaming a category with a missing or empty name must be rejected with a clear indication of what is invalid.
- Creating a category with a name that duplicates one of the same user's existing category names must be rejected.
- Renaming or deleting a category ID that does not exist must be rejected with a clear "not found" style response rather than silently succeeding.
- Renaming or deleting a category that exists but belongs to a different user must be rejected the same way regardless of whether the category exists (should not leak whether the category ID is valid for another account).
- Attempting to delete a category that still has tasks assigned to it must follow the behavior defined in Functional Requirement 9, not silently orphan those tasks' category reference.
- A logged-out (unauthenticated) request to create, view, rename, or delete a category must be rejected.
- Renaming a category to a name that would duplicate another of the same user's existing categories must be rejected, following the same rule as creation.

## Acceptance Criteria

- [ ] A logged-in user can create a category with a name, and it is saved as owned by that user.
- [ ] A logged-in user can view the list of categories they own.
- [ ] A logged-in user can rename a category they own, and the updated name is persisted.
- [ ] A logged-in user can delete a category they own, and it no longer appears in their category list afterward.
- [ ] A logged-in user cannot view, rename, or delete a category owned by a different user, under any request shape.
- [ ] Creating or renaming a category with a missing/empty or duplicate name is rejected with a clear error.
- [ ] Deleting a category that is still referenced by that user's tasks behaves according to the agreed rule (reject, or reassign/clear), with no orphaned or dangling category references left on any task.
- [ ] Unauthenticated requests to create, view, rename, or delete a category are rejected.

## Open Questions

- When a user deletes a category that still has tasks assigned to it, should the operation be rejected until the user reassigns those tasks, or should the system automatically reassign/clear the category on affected tasks?
- Are there any field-level constraints beyond "required, non-empty" expected for category names in this classroom prototype (e.g. a maximum length, allowed characters)?
- Is there a reasonable maximum number of categories a single user may create, or is this unbounded for this prototype's scope?

## Out of Scope (reiterated from PRD)

- Notifications, recurring tasks, mobile apps, payments, and collaboration features remain out of scope per `PRD.md` Section 11, and are not affected by this spec.

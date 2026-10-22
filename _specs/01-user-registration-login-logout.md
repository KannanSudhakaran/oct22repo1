# Feature Spec: User Registration and Login/Logout

## Summary

Allow a person to create a TaskFlow account, sign in to access their own tasks, and sign out to end their session. This is the entry point for the `User` role described in `PRD.md` and the foundation that every other feature (tasks, categories, steps, dashboard) depends on for identifying "whose data is this."

## Background / Context

Per `PRD.md`:

- FR-01: Users can register, log in and log out.
- FR-11: Users cannot view or modify other users' tasks.
- FR-12: Administrators can activate or deactivate user accounts.
- Authentication is login-based (Section 8, Technology Requirements).
- "Login and Registration" is listed as a main screen (Section 6).

This spec covers only account creation, authentication, and session termination for the `User` role, and the login-time checks needed to support administrator-driven account deactivation (FR-12). It does not cover task, category, step, or dashboard behavior — those are separate features.

## Goals

- A new person can register for a TaskFlow account using their own credentials.
- A registered person can log in and reach their own workspace.
- A logged-in person can log out, ending their session.
- Every authenticated action is tied to exactly one user identity, so later features can enforce the FR-11 isolation rule.
- A deactivated account (per FR-12) cannot be used to log in.

## Non-Goals

- Administrator registration or administrator login flows (assume admin accounts are provisioned separately; only the "deny login if deactivated" check is in scope here).
- Password reset / "forgot password" flows.
- Email verification or multi-factor authentication.
- Social login or third-party identity providers.
- Session/token implementation details, storage mechanism, or any other technical/implementation design — this spec describes behavior only.
- Profile editing (name/email/password changes after registration).

## User Roles & Permissions

- **User**: can register a new account, log in with their own credentials, and log out. Can only ever access their own session/identity — never another user's.
- **Administrator**: not in scope for registration/login behavior in this spec, except that an administrator's deactivation of a user account (FR-12) must be reflected immediately in that user's ability to log in.

## Functional Requirements

### Registration

1. A visitor can submit a registration request with, at minimum, an identifying credential (e.g. email or username) and a password.
2. The system must reject registration if the identifying credential is already in use by an existing account.
3. The system must reject registration if required fields are missing or empty.
4. On successful registration, a new `User`-role account is created and is active (not deactivated) by default.
5. The system must not silently accept obviously invalid input (e.g. empty password) — the person must be told why registration failed.
6. Passwords must never be stored or displayed in plain, readable form anywhere a person could view them.

### Login

7. A registered person can log in by supplying their identifying credential and password.
8. The system must reject login if the credential does not match any account, or if the password is incorrect, without revealing which of the two was wrong.
9. The system must reject login if the matched account has been deactivated by an administrator (FR-12), with a message distinct from "invalid credentials."
10. On successful login, the person is granted a session representing their identity, which subsequent features use to scope data access (supporting FR-11).
11. A logged-in person who is already authenticated and revisits the login screen should be routed to their workspace rather than asked to log in again.

### Logout

12. A logged-in person can explicitly log out.
13. On logout, the person's session ends immediately — any subsequent attempt to access user-only areas must require logging in again.
14. After logout, the person is returned to the login/registration screen.

### Session boundaries

15. All screens and data other than the login/registration screen require an active, valid session.
16. An unauthenticated visitor attempting to reach a user-only screen must be redirected to the login screen.
17. Each session is tied to exactly one user account; nothing in this flow may expose or allow selection of another account's identity.

## Edge Cases & Error Handling

- Attempting to register with a credential that's already taken.
- Attempting to register with missing/empty required fields.
- Attempting to log in with a non-existent credential.
- Attempting to log in with a correct credential but wrong password.
- Attempting to log in to a deactivated account.
- Attempting to access a user-only screen with no active session.
- Attempting to access a user-only screen after the session has ended (e.g. after logout).
- Submitting the registration or login form multiple times in quick succession (no duplicate accounts, no duplicate sessions).

## Acceptance Criteria

- [ ] A visitor can successfully register a new account with valid, unique credentials.
- [ ] Registration fails with a clear reason when the credential is already in use.
- [ ] Registration fails with a clear reason when required fields are missing.
- [ ] A registered person can log in with correct credentials and reach their own workspace.
- [ ] Login fails with a generic "invalid credentials" message for unknown credentials or wrong passwords (no hint as to which).
- [ ] Login fails with a distinct "account deactivated" message for an administrator-deactivated account.
- [ ] A logged-in person can log out and is returned to the login screen.
- [ ] After logout, user-only screens are no longer reachable without logging in again.
- [ ] An unauthenticated visitor is redirected to the login screen when attempting to reach a user-only screen.
- [ ] No feature built on top of this one can access another user's data through the session (supports FR-11).

## Open Questions

- What exactly is the identifying credential — email, username, or either? (PRD does not specify; defaulting to email is reasonable but should be confirmed.)
- Should there be any password strength/complexity requirement, or is "non-empty" sufficient for this classroom prototype?
- Does logout need to be a visible action on every screen, or just available from a persistent nav element?

## Out of Scope (reiterated from PRD)

- Notifications, recurring tasks, mobile apps, payments, and collaboration features remain out of scope per `PRD.md` Section 11, and are not affected by this spec.

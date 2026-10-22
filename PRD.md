# TaskFlow – Daily Todo App
## Product Requirements Document (PRD)

**Version:** 1.0  
**Project Type:** Classroom Prototype  
**Technology:** React, Node.js, Express and a relational database

### 1. Project Overview

TaskFlow is a simple web application that helps users organize daily tasks by category, break larger tasks into smaller steps, and track their progress.

The application supports multiple users. An administrator can view the users and their tasks but cannot modify their tasks.

### 2. Problem Statement

People often manage personal, financial and office tasks using separate notes or basic todo lists. It becomes difficult to organize tasks, track deadlines and monitor progress on larger activities.

TaskFlow provides a single place to manage and track daily work.

### 3. Project Objectives

- Create and manage daily tasks.
- Organize tasks into categories such as Office, Personal and Financial.
- Break large tasks into smaller steps.
- Track task status and completion.
- Provide a simple dashboard showing today's and overdue tasks.
- Demonstrate a complete full-stack application using React and Node.js.

### 4. User Roles

**User**
- Register and log in.
- Create, view, update and delete personal tasks.
- Manage categories.
- Add steps to tasks and track progress.
- Filter tasks by category and status.

**Administrator**
- View registered users.
- View users' tasks and their progress.
- Activate or deactivate user accounts.
- Cannot modify users' tasks.

### 5. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | Users can register, log in and log out. |
| FR-02 | Users can create, edit and delete their own tasks. |
| FR-03 | Each task has a title, description, category, priority, due date and status. |
| FR-04 | Users can create and manage task categories. |
| FR-05 | Users can add, edit, delete and complete steps within a task. |
| FR-06 | The application displays task completion progress based on completed steps. |
| FR-07 | Users can change task status: To Do, In Progress, Blocked or Done. |
| FR-08 | Users can view today's and overdue tasks on the dashboard. |
| FR-09 | Users can filter tasks by category and status. |
| FR-10 | Administrators can view users and their tasks in read-only mode. |
| FR-11 | Users cannot view or modify other users' tasks. |
| FR-12 | Administrators can activate or deactivate user accounts. |

### 6. Main Screens

1. Login and Registration
2. Today Dashboard
3. Task List
4. Task Details and Steps
5. Category Management
6. Admin Dashboard and User List

### 7. Basic Business Rules

- Every task belongs to one user.
- Users can access only their own tasks.
- Each task belongs to one category.
- A task can contain multiple steps.
- Task progress is calculated from completed steps.
- Completed tasks are marked as Done.
- Overdue tasks are visually highlighted.
- Administrators have read-only access to task details.

### 8. Technology Requirements

- **Frontend:** React
- **Backend:** Node.js and Express
- **Database:** PostgreSQL or SQLite
- **API:** REST API using JSON
- **Authentication:** Login-based authentication
- **Testing:** Basic API and application testing

### 9. Expected Deliverables

- Working React frontend.
- Node.js and Express backend.
- Database with the required tables.
- REST API for task and category management.
- User authentication and role-based access.
- Working dashboard and task progress tracking.
- Basic project documentation and demonstration.

### 10. Success Criteria

The prototype is considered successful when:

- A user can log in and manage personal tasks.
- Tasks can be organized into categories.
- Users can break tasks into steps and track progress.
- The dashboard displays today's and overdue tasks correctly.
- Users cannot access other users' private tasks.
- An administrator can view users' tasks without editing them.
- The application runs successfully during a classroom demonstration.

### 11. Out of Scope

The classroom prototype will not include:

- Email notifications or reminders.
- Recurring tasks.
- Mobile applications.
- Payment or subscription features.
- Team collaboration.
- AI-powered task suggestions.

**End of PRD**
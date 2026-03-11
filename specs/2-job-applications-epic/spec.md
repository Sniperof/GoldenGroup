# Feature Specification: Job Applications Epic

**Feature ID:** 2-job-applications-epic
**Version:** 1.0
**Date:** 2026-03-09
**Author:** Antigravity AI (on behalf of Ibrahim Obaid)
**Status:** Draft

---

## 1. Overview

### 1.1 Problem Statement

The organization currently has no structured system for managing job vacancies, tracking applicants, or coordinating the multi-stage hiring workflow. HR Managers manually handle candidate intake, evaluation, and hiring decisions through disconnected processes. This leads to lost applications, inconsistent evaluation criteria, no audit trail, and the inability to enforce hiring capacity constraints.

### 1.2 Proposed Solution

Build a complete **Job Applications Epic** as a module within the existing CRM/Dispatch system. The module provides:

1. **Vacancy Management** — HR creates, edits, closes, and archives job positions.
2. **Public Application Portal** — Candidates (or referrers on their behalf) view open jobs and submit applications via a single-page form.
3. **Application Review Dashboard** — HR views, filters, and searches all submitted applications (read-only applicant data).
4. **Workflow & Stage Management** — Applications move through strict evaluation stages: Submitted → Shortlisted → HR Interview → Training → Final Decision.
5. **Final Decision & Capacity Enforcement** — Hiring decrements the vacancy count; auto-closes the vacancy when full.
6. **Audit Log** — Every stage transition and significant action is logged with user role, timestamps, and reasons.

### 1.3 Target Users

| User Role            | Primary Actions                                                         |
|----------------------|-------------------------------------------------------------------------|
| **HR Manager**       | Create/edit vacancies, manage applications, advance stages, hire/reject |
| **Public Applicant** | View open vacancies, submit self-application                           |
| **Referrer (On-Behalf)** | Submit application on behalf of a candidate, provide referrer info |

### 1.4 Business Value

- **Structured Recruitment Pipeline** — Enforce consistent, auditable hiring stages.
- **Duplicate Detection** — Prevent duplicate applications per vacancy and flag historical duplicates.
- **Capacity Enforcement** — Automatically block over-hiring and close filled vacancies.
- **Complete Audit Trail** — Every action is logged for compliance and accountability.

---

## 2. User Scenarios & Testing

### Scenario 1: HR Creates a Job Vacancy (P1)

**Why this priority**: Core data foundation — all other features depend on vacancies existing.

**Independent Test**: HR can create, view, and manage vacancies without any other feature.

**Acceptance Scenarios**:

1. **Given** HR is on the Vacancies admin page, **When** they click "Create Vacancy" and fill the required fields (title, branch, work_type, qualifications, dates, vacancy_count), **Then** the vacancy is saved with status 'Open' and an audit log entry is created.
2. **Given** a vacancy with applications exists, **When** HR attempts to edit core requirements (age, qualifications), **Then** those fields are read-only; only end_date, responsibilities, and skills can be changed.
3. **Given** an active vacancy, **When** HR changes status to 'Closed', **Then** it no longer appears in public listings.

---

### Scenario 2: Candidate Submits a Self-Application (P1)

**Why this priority**: Core intake flow — the system must accept applications.

**Independent Test**: Candidate can view open vacancies and submit a complete application.

**Acceptance Scenarios**:

1. **Given** open vacancies exist, **When** a candidate visits the public vacancies page, **Then** they see only 'Open' vacancies displayed as cards.
2. **Given** a candidate fills the single-page form with valid personal info, address, contact, and qualifications, **When** they submit, **Then** linked applicant + job_application records are created in a single transaction with stage 'Submitted' and status 'New'.
3. **Given** a candidate submits with a mobile_number + job_vacancy_id combination that has an active (non-Hired/Rejected/Withdrawn) application, **When** they submit, **Then** the request is rejected with a user-friendly duplicate error.

---

### Scenario 3: On-Behalf Application with Referrer (P2)

**Why this priority**: Extends the core intake to support the "On-Behalf" submission flow.

**Independent Test**: A referrer submits an application for a candidate, and the referrer record is saved.

**Acceptance Scenarios**:

1. **Given** the applicant selects "On-Behalf" as submission type, **When** the form renders, **Then** a "Referrer Information" conditional section appears.
2. **Given** valid referrer data is filled, **When** submission completes, **Then** applicant, referrer, and job_application records are all created atomically in one transaction.

---

### Scenario 4: HR Filters and Views Applications (P1)

**Why this priority**: HR needs to find and review applications immediately after intake.

**Independent Test**: HR can filter the applications list by any combination of job vacancy, branch, gender, stage, status, or text search.

**Acceptance Scenarios**:

1. **Given** applications exist, **When** HR opens the Applications dashboard, **Then** a data table shows Application ID, Submitted At, Full Name, Job Name, Branch, Stage, Status, and Duplicate Flag.
2. **Given** an application has `duplicate_flag = true`, **When** it appears in the table, **Then** it has a clear visual warning indicator (e.g., orange badge).
3. **Given** HR sets filters, **When** they navigate away and return, **Then** Zustand preserves filter state.

---

### Scenario 5: HR Advances Application Through Stages (P1)

**Why this priority**: The stage workflow is the core business logic of the hiring pipeline.

**Independent Test**: HR can view an application's full detail and advance it through each valid stage transition.

**Acceptance Scenarios**:

1. **Given** an application at stage 'Submitted', **When** HR clicks "Shortlist", **Then** stage becomes 'Shortlisted' and status becomes 'Qualified'; an audit log entry is created.
2. **Given** an application at stage 'Shortlisted' with status 'Qualified', **When** HR clicks "Schedule Interview", **Then** status becomes 'Interview Scheduled'.
3. **Given** an application at stage 'HR Interview' with status other than 'Interview Completed', **When** HR attempts to move to 'Training', **Then** the backend blocks the transition with an error.

---

### Scenario 6: Final Decision — Hire with Capacity Check (P1)

**Why this priority**: The hiring decision with capacity enforcement is a critical business rule.

**Independent Test**: HR can hire a candidate, vacancy_count decrements, and auto-close triggers when count reaches 0.

**Acceptance Scenarios**:

1. **Given** `vacancy_count > 0`, **When** HR clicks "Hire", **Then** application_status becomes 'Hired', current_stage becomes 'Final Decision', vacancy_count decrements by 1, and audit log is created.
2. **Given** `vacancy_count = 0`, **When** a non-HR_MANAGER user clicks "Hire", **Then** the transaction is blocked and an error toast is shown.
3. **Given** `vacancy_count = 1`, **When** HR hires a candidate, **Then** vacancy_count becomes 0 and the vacancy status auto-updates to 'Closed'.

---

### Scenario 7: Audit Log Viewer (P2)

**Why this priority**: Accountability and compliance — must be able to review all actions on an application.

**Independent Test**: HR can view a chronological timeline of all actions performed on any specific application.

**Acceptance Scenarios**:

1. **Given** an application with multiple stage transitions, **When** HR opens the Audit Log tab, **Then** a read-only timeline displays each action in reverse chronological order with Action Type, User Role, Timestamp, and Internal Reason.

---

### Edge Cases

- What happens when an applicant submits with an email already used for a different vacancy? → Allowed (email uniqueness is per-vacancy via mobile+vacancy composite check).
- What happens when a vacancy's end_date has passed? → The vacancy remains accessible to HR but should not appear in public listings (handled by status, not date).
- What happens when two HR users try to hire for the last vacancy slot simultaneously? → The raw SQL transaction with `vacancy_count` check ensures only one succeeds.
- What happens if an applicant's mobile number matches a historical (Hired/Rejected/Withdrawn) application? → Application is accepted but `duplicate_flag` is silently set to `true`.

---

## 3. Functional Requirements

### FR-1: Database Schema

| Req ID  | Requirement |
|---------|-------------|
| FR-1.1  | System MUST create `job_vacancies` table with SERIAL PK and all specified columns including status enum ('Open', 'Closed', 'Archived'). |
| FR-1.2  | System MUST create `applicants` table with SERIAL PK for storing candidate personal data. |
| FR-1.3  | System MUST create `referrers` table with SERIAL PK and type enum ('Employee', 'Customer'), with optional FK to `employees`. |
| FR-1.4  | System MUST create `job_applications` table with SERIAL PK, FKs to job_vacancies/applicants/referrers, and enums for current_stage and application_status. |
| FR-1.5  | System MUST create `audit_logs` table with SERIAL PK and FK to job_applications and employees. |
| FR-1.6  | All IDs MUST use SERIAL PRIMARY KEY (not UUID) matching existing architecture. |
| FR-1.7  | TypeScript interfaces MUST map exactly to all database tables. |
| FR-1.8  | A utility function `insertAuditLog(client, auditData)` MUST accept a transaction client and perform a raw INSERT. |

### FR-2: Job Vacancy CRUD (Admin)

| Req ID  | Requirement |
|---------|-------------|
| FR-2.1  | `POST /api/admin/vacancies` MUST validate `start_date <= end_date`, `vacancy_count > 0`, default status 'Open', and log 'Job Vacancy Created'. |
| FR-2.2  | `GET /api/admin/vacancies` MUST support filtering by status, location/branch, and search by ID or name. |
| FR-2.3  | `PUT /api/admin/vacancies/:id` MUST enforce restricted edits: if applications exist, only `end_date`, `responsibilities`, and `required_skills` are editable. |
| FR-2.4  | `PATCH /api/admin/vacancies/:id/status` MUST update status to 'Closed' or 'Archived'. |
| FR-2.5  | Frontend MUST have a Zustand store `useVacancyStore` managing vacancy list and filter state. |
| FR-2.6  | Frontend MUST display a data table with columns: Vacancy ID, Name, Location, Dates, Required Qualification, Vacancy Count, Status. |
| FR-2.7  | Frontend MUST provide filter dropdowns for Status and Location, and a Search Bar. |
| FR-2.8  | Frontend MUST provide a Create/Edit Form modal with all vacancy fields. |

### FR-3: Public Job Listing & Application Submission

| Req ID  | Requirement |
|---------|-------------|
| FR-3.1  | `GET /api/public/vacancies` MUST return only vacancies with `status = 'Open'`. |
| FR-3.2  | `POST /api/public/applications` MUST wrap the entire operation in a `BEGIN...COMMIT` raw SQL transaction. |
| FR-3.3  | Duplicate check MUST query for active applications (status NOT IN ('Hired', 'Rejected', 'Withdrawn')) matching `mobile_number` + `job_vacancy_id`. If active duplicate exists, reject. If only historical match, set `duplicate_flag = true`. |
| FR-3.4  | The transaction MUST insert into `applicants`, conditionally into `referrers` (if On-Behalf), into `job_applications` (stage='Submitted', status='New'), and into `audit_logs`. |
| FR-3.5  | Public vacancies list MUST display lightweight cards with Job Name, Location, Age constraints, and required skills. |
| FR-3.6  | Application form MUST be a single continuous page (no stepper) with sections: Personal Info, Address, Contact, Qualifications, Attachments, and conditional Referrer section. |
| FR-3.7  | Client-side validation MUST include: age range check, 10-digit mobile number, valid email format. |

### FR-4: HR Application Listing & Filtering

| Req ID  | Requirement |
|---------|-------------|
| FR-4.1  | `GET /api/admin/applications` MUST use raw SQL JOINing `job_applications`, `applicants`, and `job_vacancies`. |
| FR-4.2  | Dynamic WHERE clauses MUST support filters: Job Vacancy, Branch, Gender, Current Stage, Application Status. |
| FR-4.3  | LIKE search MUST support Primary Mobile Number, First/Last Name, or Application ID. |
| FR-4.4  | Zustand store `useApplicationListStore` MUST preserve filter states during navigation. |
| FR-4.5  | Data table columns MUST include: Application ID, Submitted At, Full Name, Job Name, Branch, Stage, Status, Duplicate Flag. |
| FR-4.6  | Applications with `duplicate_flag = true` MUST have a clear visual warning indicator. |
| FR-4.7  | All displayed applicant data MUST be strictly read-only. |

### FR-5: Workflow & Stage Management

| Req ID  | Requirement |
|---------|-------------|
| FR-5.1  | `GET /api/admin/applications/:id` MUST return all details: application, applicant, vacancy, and referrer data. |
| FR-5.2  | `PATCH /api/admin/applications/:id/stage` MUST accept new stage, status, and optional internal notes. |
| FR-5.3  | Backend MUST enforce strict Stage Gate validation: e.g., cannot schedule interview unless 'Qualified' from Shortlist stage; cannot move to 'Final Decision' without completing 'Training'. |
| FR-5.4  | Every stage transition MUST create an audit log entry with old and new stage/status values. |
| FR-5.5  | Application Detail View MUST show sections: Request Data, Applicant Data, Vacancy Data, Referrer Data, Stage Management. |
| FR-5.6  | Stage Management UI MUST dynamically render action buttons based on `current_stage` (e.g., Shortlisted → "Qualify" / "Reject"; HR Interview → forms for Scheduled/Completed/Approved/Rejected). |

### FR-6: Final Decision & Audit Log Viewer

| Req ID  | Requirement |
|---------|-------------|
| FR-6.1  | `PATCH /api/admin/applications/:id/hire` MUST use a raw SQL transaction to check `vacancy_count` and block hiring when count ≤ 0 (unless HR_MANAGER with override flag). |
| FR-6.2  | On hire: set `application_status = 'Hired'`, `current_stage = 'Final Decision'`, decrement `vacancy_count` by 1, auto-close vacancy if count hits 0. |
| FR-6.3  | `GET /api/admin/applications/:id/audit-logs` MUST return audit logs ordered by timestamp descending. |
| FR-6.4  | Final Decision UI MUST show "Hire", "Reject", "Withdraw" buttons only in the Final Decision stage. |
| FR-6.5  | Audit Log Tab MUST display a read-only timeline with Action Type, User Role, Timestamp, and Internal Reasons. |

---

## 4. Key Entities

### 4.1 job_vacancies

| Column                    | SQL Type            | Constraints / Notes                           |
|---------------------------|---------------------|-----------------------------------------------|
| id                        | SERIAL PRIMARY KEY  |                                               |
| title                     | VARCHAR(255)        | NOT NULL                                      |
| branch                    | VARCHAR(255)        |                                               |
| work_type                 | VARCHAR(100)        |                                               |
| required_gender           | VARCHAR(20)         |                                               |
| required_age_min          | INTEGER             |                                               |
| required_age_max          | INTEGER             |                                               |
| required_qualification    | VARCHAR(255)        |                                               |
| required_experience_years | INTEGER             |                                               |
| required_skills           | TEXT                |                                               |
| responsibilities          | TEXT                |                                               |
| driving_license_required  | BOOLEAN             | DEFAULT FALSE                                 |
| vacancy_count             | INTEGER             | NOT NULL, CHECK > 0                           |
| start_date                | DATE                |                                               |
| end_date                  | DATE                |                                               |
| status                    | VARCHAR(20)         | CHECK IN ('Open', 'Closed', 'Archived'), DEFAULT 'Open' |
| created_at                | TIMESTAMPTZ         | DEFAULT NOW()                                 |
| updated_at                | TIMESTAMPTZ         | DEFAULT NOW()                                 |

### 4.2 applicants

| Column           | SQL Type            | Constraints / Notes    |
|------------------|---------------------|------------------------|
| id               | SERIAL PRIMARY KEY  |                        |
| first_name       | VARCHAR(255)        | NOT NULL               |
| last_name        | VARCHAR(255)        |                        |
| dob              | DATE                |                        |
| gender           | VARCHAR(20)         |                        |
| marital_status   | VARCHAR(50)         |                        |
| email            | VARCHAR(255)        |                        |
| mobile_number    | VARCHAR(20)         | NOT NULL               |
| governorate      | VARCHAR(255)        |                        |
| city             | VARCHAR(255)        |                        |
| sub_area         | VARCHAR(255)        |                        |
| neighborhood     | VARCHAR(255)        |                        |
| detailed_address | TEXT                |                        |
| cv_url           | TEXT                |                        |
| photo_url        | TEXT                |                        |
| created_at       | TIMESTAMPTZ         | DEFAULT NOW()          |

### 4.3 referrers

| Column        | SQL Type            | Constraints / Notes                     |
|---------------|---------------------|-----------------------------------------|
| id            | SERIAL PRIMARY KEY  |                                         |
| type          | VARCHAR(20)         | CHECK IN ('Employee', 'Customer')       |
| employee_id   | INTEGER             | FK → employees(id), nullable            |
| full_name     | VARCHAR(255)        |                                         |
| mobile_number | VARCHAR(20)         |                                         |
| governorate   | VARCHAR(255)        |                                         |
| city          | VARCHAR(255)        |                                         |
| profession    | VARCHAR(255)        |                                         |
| notes         | TEXT                |                                         |

### 4.4 job_applications

| Column             | SQL Type            | Constraints / Notes                                                                 |
|--------------------|---------------------|-------------------------------------------------------------------------------------|
| id                 | SERIAL PRIMARY KEY  |                                                                                     |
| job_vacancy_id     | INTEGER             | FK → job_vacancies(id), NOT NULL                                                    |
| applicant_id       | INTEGER             | FK → applicants(id), NOT NULL                                                       |
| referrer_id        | INTEGER             | FK → referrers(id), nullable                                                         |
| submission_type    | VARCHAR(20)         | CHECK IN ('Self', 'On-Behalf')                                                      |
| source             | VARCHAR(20)         | CHECK IN ('Mobile App', 'Website', 'External', 'Manual')                            |
| current_stage      | VARCHAR(30)         | CHECK IN ('Submitted', 'Shortlisted', 'HR Interview', 'Training', 'Final Decision') |
| application_status | VARCHAR(30)         | CHECK IN ('New', 'In Review', 'Qualified', 'Rejected', 'Interview Scheduled', 'Interview Completed', 'Interview Failed', 'Approved', 'Training Scheduled', 'Training Started', 'Training Completed', 'Retraining', 'Passed', 'Failed', 'Hired', 'Withdrawn') |
| duplicate_flag     | BOOLEAN             | DEFAULT FALSE                                                                       |
| internal_notes     | TEXT                |                                                                                     |
| created_at         | TIMESTAMPTZ         | DEFAULT NOW()                                                                       |
| updated_at         | TIMESTAMPTZ         | DEFAULT NOW()                                                                       |

### 4.5 audit_logs

| Column               | SQL Type            | Constraints / Notes                |
|----------------------|---------------------|------------------------------------|
| id                   | SERIAL PRIMARY KEY  |                                    |
| application_id       | INTEGER             | FK → job_applications(id)          |
| action_type          | VARCHAR(100)        | NOT NULL                           |
| performed_by_role    | VARCHAR(50)         |                                    |
| performed_by_user_id | INTEGER             | FK → employees(id)                 |
| old_value            | TEXT                |                                    |
| new_value            | TEXT                |                                    |
| internal_reason      | TEXT                |                                    |
| timestamp            | TIMESTAMPTZ         | DEFAULT NOW()                      |

---

## 5. Stage Transition Rules

The application lifecycle follows this strict progression:

```
Submitted → Shortlisted → HR Interview → Training → Final Decision
```

### Valid Transitions per Stage

| Current Stage   | Valid Status Transitions                                                              | Gate Rule                                               |
|-----------------|--------------------------------------------------------------------------------------|---------------------------------------------------------|
| **Submitted**   | New → In Review → Qualified / Rejected                                                | —                                                       |
| **Shortlisted** | Qualified → Interview Scheduled / Rejected                                             | Must be 'Qualified' to schedule interview                |
| **HR Interview** | Interview Scheduled → Interview Completed → Approved / Interview Failed / Rejected    | Must complete interview before approval                  |
| **Training**    | Training Scheduled → Training Started → Training Completed / Retraining / Failed       | Must be 'Approved' from HR Interview to enter Training   |
| **Final Decision** | Passed / Failed / Hired / Rejected / Withdrawn                                      | Must complete Training (status 'Training Completed' → 'Passed') before hire |

> [!IMPORTANT]
> The backend MUST reject any stage transition that violates these gate rules. The frontend renders action buttons conditionally, but the backend is the authoritative enforcer.

---

## 6. Scope & Boundaries

### In Scope

- Database schema for 5 new tables (`job_vacancies`, `applicants`, `referrers`, `job_applications`, `audit_logs`).
- TypeScript interfaces and `insertAuditLog` utility.
- Admin vacancy CRUD routes and UI (data table + create/edit modal + filters).
- Public vacancy listing and application submission routes and UI (single-page form with conditional referrer section).
- Admin application listing with dynamic filtering and read-only display.
- Application detail view with stage management UI.
- Final decision logic with vacancy capacity enforcement.
- Audit log viewer per application.

### Out of Scope

- File upload storage (cv_url/photo_url are URL references only, not handled by this system).
- Authentication/authorization middleware (assumes user context is available).
- Email/SMS notifications to applicants.
- Reporting and analytics dashboards.
- Bulk operations on applications.

---

## 7. Dependencies

| Dependency        | Description                                                        |
|-------------------|--------------------------------------------------------------------|
| `employees` table | Existing table; FKed by `referrers.employee_id` and `audit_logs.performed_by_user_id`. |
| `pg` pool         | Existing `server/db.ts` database connection pool.                   |
| `server/schema.ts`| Existing schema file where new CREATE TABLE statements will be added. |
| `server/index.ts` | Existing Express app where new route files will be registered.       |
| `src/lib/types.ts`| Existing types file where new interfaces will be added.              |

---

## 8. Assumptions

| ID   | Assumption                                                                                           |
|------|------------------------------------------------------------------------------------------------------|
| A-1  | The "performed_by_user_id" in audit logs references the existing `employees` table.                  |
| A-2  | Vacancy `branch` values align with existing geographic data (governorates/cities).                    |
| A-3  | The duplicate check uses `mobile_number` (not email) as the primary identity key per vacancy.         |
| A-4  | The HR_MANAGER role is identified by a flag or role value in the user context (implementation detail). |
| A-5  | CV and photo URLs are externally hosted; file upload is out of scope.                                 |
| A-6  | The `source` field defaults to 'Website' for public submissions.                                      |

---

## 9. Success Criteria

| Criterion | Metric                                                                                               |
|-----------|------------------------------------------------------------------------------------------------------|
| SC-1      | HR Manager can create, edit, close, and archive job vacancies via admin interface.                    |
| SC-2      | A candidate can view open vacancies and submit a complete application via a single-page form.          |
| SC-3      | Duplicate applications (same mobile + same vacancy with active status) are blocked with a clear error. |
| SC-4      | HR can filter applications by any combination of vacancy, branch, gender, stage, status, or text search. |
| SC-5      | Applications advance through stages with enforced gate validation; illegal transitions are rejected.   |
| SC-6      | Hiring a candidate decrements vacancy_count; vacancy auto-closes when count reaches 0.                |
| SC-7      | Every significant action creates an audit log entry viewable in the application's timeline.            |
| SC-8      | All database operations use raw SQL via `pg` — zero ORM usage.                                        |

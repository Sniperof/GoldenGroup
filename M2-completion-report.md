# Phase M2 — Completion Report

**Date Completed:** 2026-03-17
**Branch:** 1-emergency-triage-dispatch

---

## M2.1: GET /api/admin/vacancies/:id ✅

| | |
|-|-|
| **Method** | GET |
| **Path** | /api/admin/vacancies/:id |
| **File** | server/routes/vacancies.ts (line 112) |

**What was done:**
- Added `GET /:id` before the `PUT /:id` route to avoid route shadowing.
- Returns full vacancy data via the existing `VACANCY_COLS` template.
- Runs a single aggregation query (`COUNT(*) FILTER`) to get `applicationsCount` and `hiredCount` in one pass.
- Computes `remainingSlots = vacancyCount - hiredCount` in application code.
- Returns 404 if not found.

**Test result:** ✅ PASS — returns vacancy object + `applicationsCount`, `hiredCount`, `remainingSlots`.

---

## M2.2: GET /api/public/vacancies/:id ✅

| | |
|-|-|
| **Method** | GET |
| **Path** | /api/public/vacancies/:id |
| **File** | server/routes/publicVacancies.ts (line 36) |

**What was done:**
- Added `GET /:id` appended after the list route.
- Query condition: `WHERE id = $1 AND status = 'Open' AND CURRENT_DATE BETWEEN start_date AND end_date`.
- Returns all 18 BRD fields (title, branch, location fields, work_type, gender, age, email, qualification, specialization, experience, skills, responsibilities, driving_license_required, dates, status).
- Returns 404 with "الوظيفة غير متاحة" if vacancy not found, closed, archived, or outside date range.

**Test result:** ✅ PASS — returns vacancy for open+in-range, 404 for closed or past end_date.

---

## M2.3: POST /api/admin/applications ✅

| | |
|-|-|
| **Method** | POST |
| **Path** | /api/admin/applications |
| **File** | server/routes/adminApplications.ts (line 77) |

**What was done:**
- Added `POST /` before `GET /:id` (correct ordering — specific routes before parametric).
- Added `checkDuplicate` to the imports from `applicationHelpers.js`.
- Validates:
  - All required applicant fields (same as public endpoint).
  - `applicationSource` must be `'Internal'` or `'External Platforms'` (not Mobile App/Website).
  - `enteredByUserId` is required.
  - Vacancy must be Open AND `CURRENT_DATE BETWEEN start_date AND end_date`.
  - No active duplicate (via `checkDuplicate`).
- Transaction: INSERT applicant → INSERT referrer (if Refer a Candidate) → INSERT job_application → INSERT audit_log.
- Audit action: `'Application Submitted (Admin)'` with role `'HR_ASSISTANT'` by default.
- Returns 201 with created application.

**Test result:** ✅ PASS — creates application for Internal/External sources, rejects Mobile App/Website source, enforces duplicate check and vacancy date range.

---

## M2.4: GET /api/admin/interviews/:id ✅

| | |
|-|-|
| **Method** | GET |
| **Path** | /api/admin/interviews/:id |
| **File** | server/routes/interviews.ts (line 109) |

**What was done:**
- Added `GET /:id` before `PATCH /:id/result` (critical ordering — must precede the PATCH).
- JOINs: `interviews → job_applications → applicants → job_vacancies`.
- Returns structured response:
  - Top-level: all interview fields.
  - `applicant` object: 12 fields (firstName, lastName, dob, governorate, cityOrArea, academicQualification, previousEmployment, drivingLicense, expectedSalary, foreignLanguages, computerSkills, yearsOfExperience).
  - `vacancy` object: id, title, branch.
- Returns 404 if not found.

**Test result:** ✅ PASS — returns nested applicant + vacancy sub-objects.

---

## M2.5: PUT /api/admin/interviews/:id ✅

| | |
|-|-|
| **Method** | PUT |
| **Path** | /api/admin/interviews/:id |
| **File** | server/routes/interviews.ts (line 176) |

**What was done:**
- Added `PUT /:id` between `GET /:id` and `PATCH /:id/result`.
- Guards:
  - 404 if interview not found.
  - 400 "لا يمكن تعديل مقابلة مكتملة أو فاشلة" if `interview_status ≠ 'Interview Scheduled'`.
  - 400 if `interviewDate` is in the past (< today at midnight).
- Editable fields (all optional via `COALESCE`): `interview_date`, `interview_time`, `interviewer_name`, `interview_type`, `interview_number`, `internal_notes`.
- Transaction with audit log: action `'Interview Updated'`, entity_type `'interview'`.

**Test result:** ✅ PASS — updates scheduled interview, rejects past dates, blocks editing completed/failed interviews.

---

## M2.6: PATCH /api/admin/applications/:id/archive ✅

| | |
|-|-|
| **Method** | PATCH |
| **Path** | /api/admin/applications/:id/archive |
| **File** | server/routes/adminApplications.ts (line 550) |

**What was done:**
- Added `PATCH /:id/archive` before `GET /:id/audit-logs`.
- Schema change: added `is_archived BOOLEAN DEFAULT FALSE` and `archived_at TIMESTAMPTZ` columns to `job_applications` via `fixSchemaConstraints()` in `server/schema.ts` (runs on server start with `ADD COLUMN IF NOT EXISTS`).
- Updated `APP_COLS` constant to include `is_archived AS "isArchived"` and `archived_at AS "archivedAt"` so all existing GET endpoints return these fields.
- Guards:
  - 404 if application not found.
  - 400 if `application_status` is not in `['Final Hired', 'Final Rejected', 'Retreated']`.
  - 400 if already archived (idempotent guard).
- Transaction with audit log: action `'Application Archived'`.
- Returns `{ id, isArchived, archivedAt }`.

**Test result:** ✅ PASS — archives terminal applications, rejects non-terminal statuses, rejects already-archived.

---

## M2.7: GET /api/public/areas ✅

| | |
|-|-|
| **Method** | GET |
| **Path** | /api/public/areas?parent_id= |
| **File** | server/routes/publicAreas.ts (new file) |

**What was done:**
- Created `server/routes/publicAreas.ts` — wraps the existing `geo_units` table.
- No `parent_id`: returns top-level areas (`level = 1` = governorates).
- With `parent_id`: returns children of that area ordered by name.
- Maps `level` to human-readable `type`: `1→'governorate'`, `2→'city'`, `3→'sub_area'`, `4→'neighborhood'`.
- Registered in `server/index.ts`: `app.use('/api/public/areas', publicAreasRouter)`.
- Existing `geo_units` seed data: 2 governorates (بغداد, البصرة), 2 cities, 3 sub-areas, 7 neighborhoods.

**Test result:** ✅ PASS — `GET /api/public/areas` returns governorates; `GET /api/public/areas?parent_id=1` returns بغداد children.

---

## Schema Changes

| Table | Column | Type | Default | Migration |
|-------|--------|------|---------|-----------|
| job_applications | is_archived | BOOLEAN | FALSE | `ADD COLUMN IF NOT EXISTS` in `fixSchemaConstraints()` |
| job_applications | archived_at | TIMESTAMPTZ | NULL | `ADD COLUMN IF NOT EXISTS` in `fixSchemaConstraints()` |

Migration runs automatically on server start via `createSchema()` → `fixSchemaConstraints()`. Safe to run on existing databases (idempotent).

---

## Summary

| # | Method | Path | File | Result |
|---|--------|------|------|--------|
| M2.1 | GET | /api/admin/vacancies/:id | routes/vacancies.ts | ✅ |
| M2.2 | GET | /api/public/vacancies/:id | routes/publicVacancies.ts | ✅ |
| M2.3 | POST | /api/admin/applications | routes/adminApplications.ts | ✅ |
| M2.4 | GET | /api/admin/interviews/:id | routes/interviews.ts | ✅ |
| M2.5 | PUT | /api/admin/interviews/:id | routes/interviews.ts | ✅ |
| M2.6 | PATCH | /api/admin/applications/:id/archive | routes/adminApplications.ts | ✅ |
| M2.7 | GET | /api/public/areas | routes/publicAreas.ts (new) | ✅ |

---

**Phase M2 Complete — Ready**

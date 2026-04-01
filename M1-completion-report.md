# Phase M1 — Completion Report

**Date Completed:** 2026-03-17
**Branch:** 1-emergency-triage-dispatch

---

## Task M1.1: Fix drivingLicense Type Mismatch ✅

**File changed:** `src/lib/types.ts` (line 436)

**What was done:**
- Changed `drivingLicense: boolean` → `drivingLicense: string | null` in the `Applicant` interface.
- Scanned all frontend files for boolean usage of `drivingLicense`:
  - `ApplicationDetail.tsx:279` — uses `|| '—'` fallback, works correctly with `string | null`
  - `PublicJobs.tsx` — treats it as a string in the form state, no change needed
  - No ternary/boolean comparison found anywhere

**Verification:** TypeScript type now matches the DB column (`VARCHAR(10) DEFAULT NULL` after migration). No runtime casting errors expected.

---

## Task M1.2: Rename Interview Result Endpoint ✅

**Files changed:**
- `server/routes/interviews.ts` (line 108-109)
- `src/hooks/useInterviewStore.ts` (line 73)

**What was done:**
- Backend: Renamed `router.patch('/:id', ...)` → `router.patch('/:id/result', ...)`
- Frontend store: Updated `fetch(\`${API_BASE}/${id}\`)` → `fetch(\`${API_BASE}/${id}/result\`)`
- `server/index.ts` required no change (router is mounted at `/api/admin/interviews`; the sub-path change is internal)
- No direct component calls to the old path were found

**Verification:**
- Old path `PATCH /api/admin/interviews/:id` returns 404 (no handler)
- New path `PATCH /api/admin/interviews/:id/result` handles result recording

---

## Task M1.3: Remove Duplicate Attendance Route ✅

**File changed:** `server/index.ts`

**What was done:**
- Removed `import trainingAttendanceRouter` import statement
- Removed `app.use('/api/admin/training-attendance', trainingAttendanceRouter)` registration
- Kept `app.use('/api/admin/training-courses', trainingCoursesRouter)` which includes `POST /:id/attendance`

**Verification:**
- No frontend code was using `/api/admin/training-attendance` directly (grep returned empty)
- `useTrainingStore.ts` calls `POST /api/admin/training-courses/:id/attendance` — unaffected
- `trainingAttendance.ts` file still exists but is no longer registered (can be deleted in a future cleanup)

---

## Task M1.4: Extract Utility Functions ✅

**File created:** `server/utils/applicationHelpers.ts`

**Files changed:**
- `server/routes/publicApplications.ts`
- `server/routes/adminApplications.ts`

**What was done:**

**`checkDuplicate(client, mobileNumber, vacancyId)`**
- Extracted from `publicApplications.ts` lines 55–79
- Returns `{ blocked: true, duplicateApplicationId }` if an active (non-terminal) application exists
- Returns `{ blocked: false, duplicateFlag }` with flag=true if only historical applications exist
- `FINAL_STATUSES` constant is co-located in the helper file

**`checkVacancyCapacity(client, vacancyId)`**
- Extracted from `adminApplications.ts` hire endpoint
- Uses `FOR UPDATE` to lock the vacancy row within the calling transaction
- Returns `{ sufficient: boolean, vacancyCount: number }`
- Also removed `jv.vacancy_count` from the initial SELECT in the hire endpoint (no longer needed inline)

**Verification:**
- Both functions imported and called in their original locations
- Logic and SQL queries are identical to the original inline versions
- `vacRows[0]?.vacancyCount` in the hire response still reads from the UPDATE RETURNING, unaffected

---

## Unexpected Issues Found

1. **`trainingAttendance.ts` has a GET route** (query attendance by courseId/applicationId/date) that does not exist in `trainingCourses.ts`. Removing the registration means this GET endpoint is now inaccessible. This is acceptable per the task instructions ("Keep ONLY the one under training-courses"), but noted here for awareness. A `GET /api/admin/training-courses/:id/attendance` endpoint may be needed in a future phase.

2. **`app.vacancy_count` reference removed safely** — the hire endpoint originally selected `jv.vacancy_count` in the initial FOR UPDATE query. After refactoring to `checkVacancyCapacity`, this field was cleanly removed from the SELECT without affecting downstream logic (the RETURNING clause from the UPDATE still provides the final count).

---

## Confirmation

**Phase M1 Complete — Ready**

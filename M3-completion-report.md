# Phase M3 — Completion Report

**Date Completed:** 2026-03-17
**Branch:** 1-emergency-triage-dispatch

---

## M3.1: Vacancy Filter for Interviews List ✅

### Backend — `server/routes/interviews.ts` (GET /)

| | |
|-|-|
| **Param** | `jobVacancyId` (was `vacancyId`) |
| **Condition** | `ja.job_vacancy_id = $n` |

**What was done:**
- Renamed destructured query param from `vacancyId` → `jobVacancyId`.
- Updated the dynamic `conditions.push(...)` to use `jobVacancyId`.
- Updated the route comment to document `?jobVacancyId=`.

### Store — `src/hooks/useInterviewStore.ts`

**What was done:**
- Renamed `vacancyId: string` → `jobVacancyId: string` in `InterviewFilters` interface.
- Updated `defaultFilters` constant accordingly.
- Updated `fetchInterviews` to send `params.set('jobVacancyId', f.jobVacancyId)` instead of `vacancyId`.

### UI — `src/pages/jobs/Interviews.tsx`

**What was done:**
- Imported `useVacancyStore`.
- Called `fetchVacancies()` in a one-time `useEffect([])` on mount.
- Added a `<select>` dropdown in the filter bar (between applicant-ID input and date picker):
  - Default option: `كل الوظائف` (empty string → no filter).
  - Dynamic `<option>` elements from `vacancies` array, keyed by `v.id`, value `String(v.id)`.
  - Bound to `filters.jobVacancyId` via `setFilter('jobVacancyId', e.target.value)`.
- Updated `useEffect` dependency array: `filters.vacancyId` → `filters.jobVacancyId`.
- Updated "مسح الفلاتر" show condition: `filters.vacancyId` → `filters.jobVacancyId`.

**Test result:** ✅ PASS — selecting a vacancy from the dropdown triggers a re-fetch with `?jobVacancyId=<id>`; "كل الوظائف" clears the filter.

---

## M3.2: Interviewer Conflict Check ✅

| | |
|-|-|
| **Method** | POST |
| **Path** | /api/admin/interviews |
| **File** | server/routes/interviews.ts (inside POST / handler) |
| **Response** | 409 Conflict |

**What was done:**
- After `BEGIN` and M3.3 check, queries:
  ```sql
  SELECT id FROM interviews
  WHERE interviewer_name = $1
    AND interview_date = $2
    AND interview_time = $3
    AND interview_status = 'Interview Scheduled'
  ```
- If any row exists → `ROLLBACK` + `409 { error: 'المقابِل لديه مقابلة أخرى في نفس التاريخ والوقت' }`.
- Does **not** block if same interviewer has a different time-slot on the same day.

**Test result:** ✅ PASS — second interview for same interviewer+date+time returns 409; different time-slot proceeds normally.

---

## M3.3: Prevent Duplicate Scheduled Interview ✅

| | |
|-|-|
| **Method** | POST |
| **Path** | /api/admin/interviews |
| **File** | server/routes/interviews.ts (inside POST / handler) |
| **Response** | 409 Conflict |

**What was done:**
- First check after `BEGIN`:
  ```sql
  SELECT id FROM interviews
  WHERE application_id = $1
    AND interview_status = 'Interview Scheduled'
  ```
- If any row exists → `ROLLBACK` + `409 { error: 'يوجد مقابلة مجدولة بالفعل لهذا الطلب' }`.
- Check runs **before** the interviewer conflict check (M3.2) so the more specific error is returned first.

**Test result:** ✅ PASS — second schedule attempt for same application with an open scheduled interview returns 409; application with only completed/failed interviews is allowed.

---

## Check Order in POST /

```
BEGIN
  ↓
M3.3 — duplicate scheduled interview?  → 409 if yes
  ↓
M3.2 — interviewer time-slot conflict? → 409 if yes
  ↓
INSERT interviews
  ↓
insertAuditLog
  ↓
COMMIT → 201
```

---

## Summary

| # | Task | File | Result |
|---|------|------|--------|
| M3.1 | Vacancy filter — backend param rename | server/routes/interviews.ts | ✅ |
| M3.1 | Vacancy filter — store rename | src/hooks/useInterviewStore.ts | ✅ |
| M3.1 | Vacancy filter — UI dropdown | src/pages/jobs/Interviews.tsx | ✅ |
| M3.2 | Interviewer conflict check (409) | server/routes/interviews.ts | ✅ |
| M3.3 | Duplicate scheduled interview guard (409) | server/routes/interviews.ts | ✅ |

---

**Phase M3 Complete — Ready**

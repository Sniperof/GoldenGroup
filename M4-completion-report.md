# Phase M4 — Completion Report

**Date Completed:** 2026-03-17
**Branch:** 1-emergency-triage-dispatch

---

## M4.1: Application Source Filter ✅

### Backend — `server/routes/adminApplications.ts` (GET /)

**What was done:**
- Added `applicationSource` to the destructured query params.
- Added conditional: `if (applicationSource) { conditions.push('ja.application_source = $n'); params.push(applicationSource); }`.

### Store — `src/hooks/useApplicationListStore.ts`

**What was done:**
- Added `applicationSource: string` to `ApplicationFilters` interface.
- Added `applicationSource: ''` to `defaultFilters`.
- Added `if (f.applicationSource) params.set('applicationSource', f.applicationSource)` in `fetchApplications`.

### UI — `src/pages/jobs/Applications.tsx`

**What was done:**
- Added `applicationSource` dropdown to the filters bar with options:
  - `كل المصادر` (default — empty string, no filter)
  - `Mobile App`
  - `Website`
  - `External Platforms`
  - `Internal`
- Added `filters.applicationSource` to the `useEffect` dependency array.
- Added `filters.applicationSource` to the "مسح الفلاتر" show condition.

**Test result:** ✅ PASS — selecting "Internal" returns only Internal-sourced applications; "كل المصادر" shows all.

---

## M4.2: Archived Filter ✅

### Backend — `server/routes/adminApplications.ts` (GET /)

**What was done:**
- `is_archived` column already exists from M2.6 migration — no schema change needed.
- Added `isArchived` to destructured query params.
- Added conditional block after all other filters:
  ```typescript
  if (isArchived === 'true') {
    conditions.push('ja.is_archived = TRUE');
  } else {
    conditions.push('(ja.is_archived = FALSE OR ja.is_archived IS NULL)');
  }
  ```
- Default behavior (no param or `isArchived=false`): hides archived records.

### Store — `src/hooks/useApplicationListStore.ts`

**What was done:**
- Added `isArchived: string` to `ApplicationFilters` interface.
- Added `isArchived: 'false'` to `defaultFilters` (non-archived by default).
- Added `params.set('isArchived', f.isArchived)` (always sent — ensures backend default applies).

### UI — `src/pages/jobs/Applications.tsx`

**What was done:**
- Added "Show Archived" toggle above the table:
  ```tsx
  <input type="checkbox" checked={filters.isArchived === 'true'}
    onChange={e => setFilter('isArchived', e.target.checked ? 'true' : 'false')} />
  عرض المؤرشفة فقط
  ```
- Added `filters.isArchived` to the `useEffect` dependency array.
- Updated "مسح الفلاتر" show condition to include `filters.isArchived === 'true'`.

**Test result:** ✅ PASS — unchecked shows only live records; checked shows only archived.

---

## M4.3: Archive UI ✅

### `src/lib/types.ts`

**What was done:**
- Added `isArchived: boolean` and `archivedAt: string | null` to `JobApplication` interface — these fields were already returned by the backend (`APP_COLS`) but missing from the type.

### `src/pages/jobs/Applications.tsx` — Archived column

**What was done:**
- Added `Archive` icon import from lucide-react.
- Added `أرشيف` column header to the table.
- Added corresponding cell in each row: shows `مؤرشف` badge (slate, Archive icon) when `app.isArchived` is true; empty otherwise.

### `src/pages/jobs/ApplicationDetail.tsx` — Archive button

**What was done:**
- Added `Archive` icon import.
- Added `ARCHIVABLE_STATUSES = ['Final Hired', 'Final Rejected', 'Retreated']` constant.
- Added `handleArchive()` async function: calls `PATCH /api/admin/applications/:id/archive`, refreshes detail on success, sets `actionError` on failure.
- Added Archive button after the terminal status badge:
  - Visible **only** when `ARCHIVABLE_STATUSES.includes(detail.applicationStatus) && !detail.isArchived`
  - Calls `handleArchive()`, disabled during `actionLoading`
- Added archived indicator: when `detail.isArchived`, shows a small badge with Archive icon + formatted `archivedAt` date.

**Test result:** ✅ PASS — "أرشفة الطلب" button appears for Final Hired/Rejected/Retreated non-archived apps; hidden for Rejected/Interview Failed; hidden once archived; archived badge with date shown after archiving.

---

## M4.4: Input Sanitization ✅

### `server/utils/sanitize.ts` (new file)

**What was done:**
- Created `sanitizeText(input: string): string` function that:
  1. Removes `<script>...</script>` blocks (multi-line, case-insensitive).
  2. Removes `<style>...</style>` blocks.
  3. Removes all remaining HTML/XML tags (`<[^>]+>`).
  4. Removes `javascript:` URI schemes.
  5. Removes `data:` URI schemes.
  6. Trims whitespace.
- Returns input unchanged if it is falsy or not a string.

### Applied in `server/routes/publicApplications.ts`

| Field | Location |
|-------|----------|
| `referrer.fullName`, `referrer.lastName` | referrer INSERT |
| `referrer.governorate`, `cityOrArea`, `subArea`, `neighborhood`, `detailedAddress` | referrer INSERT |
| `referrer.referrerWork`, `referrer.referrerNotes` | referrer INSERT |

### Applied in `server/routes/adminApplications.ts`

| Field | Location |
|-------|----------|
| `referrer.fullName`, `referrer.lastName` | referrer INSERT (POST /) |
| `referrer.governorate`, `cityOrArea`, `subArea`, `neighborhood`, `detailedAddress` | referrer INSERT |
| `referrer.referrerWork`, `referrer.referrerNotes` | referrer INSERT |
| `notes` | PATCH /:id/notes |

### Applied in `server/routes/interviews.ts`

| Field | Location |
|-------|----------|
| `b.interviewerName`, `b.internalNotes` | POST / INSERT |
| `b.interviewerName`, `b.internalNotes` | PUT /:id UPDATE |
| `internalNotes` | PATCH /:id/result UPDATE |

### Applied in `server/routes/trainingCourses.ts`

| Field | Location |
|-------|----------|
| `training_name`, `branch`, `trainer` | POST / INSERT |
| `device_name`, `notes` | POST / INSERT |

**Test result:** ✅ PASS — input `<script>alert(1)</script>hello` → stored as `hello`; `<b>bold</b>text` → stored as `boldtext`; `javascript:void(0)` → stored as `void(0)`; plain Arabic text passes through unchanged.

---

## Schema Changes

None in M4 (is_archived column was added in M2.6; already present).

---

## Summary

| # | Task | Files | Result |
|---|------|-------|--------|
| M4.1 | applicationSource filter | adminApplications.ts, useApplicationListStore.ts, Applications.tsx | ✅ |
| M4.2 | isArchived filter (default: hide archived) | adminApplications.ts, useApplicationListStore.ts, Applications.tsx | ✅ |
| M4.3 | Archive column in list + Archive button in detail | Applications.tsx, ApplicationDetail.tsx, types.ts | ✅ |
| M4.4 | sanitizeText utility + applied to 4 route files | sanitize.ts (new), publicApplications.ts, adminApplications.ts, interviews.ts, trainingCourses.ts | ✅ |

---

**Phase M4 Complete — Ready**

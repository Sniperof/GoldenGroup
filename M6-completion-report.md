# Phase M6 — Completion Report

**Date Completed:** 2026-03-17
**Branch:** 1-emergency-triage-dispatch

---

## M6.1: Investigated Existing Auth ✅

**Findings:**
- Zero auth existed (no jsonwebtoken/bcrypt, no middleware directory, no hr_users table)
- All `/api/admin/*` routes completely unprotected
- Frontend: hardcoded user "إبراهيم عبيد", no login page, no token management
- `src/lib/api.ts` was a plain fetch wrapper with no auth headers
- Audit log fields (`performedByRole`, `performedByUserId`) accepted from request body without verification

---

## M6.2: Create Auth Middleware ✅

### New Package Dependencies
- `jsonwebtoken` + `@types/jsonwebtoken`
- `bcryptjs` + `@types/bcryptjs`

### New File: `server/middleware/auth.ts`

**What was done:**
- Declared `AuthUser { id, name, role }` interface and augmented `Express.Request` with `req.user?: AuthUser`
- `requireAuth`: Validates `Authorization: Bearer <token>` JWT; 401 if missing/invalid/expired
- `requireRole(...roles)`: Checks `req.user.role` against allowed roles; 403 if unauthorized
- `JWT_SECRET = process.env.JWT_SECRET || 'REDACTED'` (12h expiry)

### New File: `server/routes/auth.ts`

**What was done:**
- `POST /api/auth/login`: Accepts `{ username, password }`, queries `hr_users`, bcrypt-compares password, returns `{ token, user: { id, name, role } }` on success
- 401 on wrong credentials, 403 on inactive account

### Updated: `server/schema.ts`

**What was done:**
- Added `createHrUsers()` called after `fixSchemaConstraints()`:
  - Creates `hr_users (id, name, username, password_hash, role CHECK IN ('HR_MANAGER','HR_ASSISTANT'), is_active, created_at)`
  - Drops FK constraints on `audit_logs.performed_by_user_id`, `job_applications.entered_by_user_id`, `training_courses.created_by_user_id`, `training_course_trainees.result_recorded_by`, `training_attendance.recorded_by_user_id` (all were `REFERENCES employees(id)` — now plain integers referencing hr_users)
- `seedData()` now seeds two default HR users (idempotent):
  - `hr_manager` / `manager123` → role `HR_MANAGER`
  - `hr_assistant` / `assistant123` → role `HR_ASSISTANT`

### Updated: `server/index.ts`

**What was done:**
- Added `import authRouter from './routes/auth.js'`
- Registered: `app.use('/api/auth', authRouter)`

---

## M6.3: Apply Middleware to All Routes + Audit Log Replacement ✅

### `server/routes/vacancies.ts`

| Method | Route | Middleware Applied |
|--------|-------|--------------------|
| GET | `/` | `requireAuth` |
| POST | `/` | `requireRole('HR_MANAGER')` |
| GET | `/:id` | `requireAuth` |
| PUT | `/:id` | `requireRole('HR_MANAGER')` |
| PATCH | `/:id/status` | `requireRole('HR_MANAGER')` |

**Audit log replacements (3 calls):**
- `performedByRole: v.performedByRole || 'HR_MANAGER'` → `req.user!.role`
- `performedByUserId: v.performedByUserId || null` → `req.user!.id`
- Removed `performedByRole`/`performedByUserId` from `req.body` destructuring in `/status` handler

### `server/routes/adminApplications.ts`

| Method | Route | Middleware Applied |
|--------|-------|--------------------|
| GET | `/` | `requireAuth` |
| POST | `/` | `requireRole('HR_ASSISTANT', 'HR_MANAGER')` |
| GET | `/:id` | `requireAuth` |
| PATCH | `/:id/stage` | `requireAuth` |
| PATCH | `/:id/hire` | `requireRole('HR_MANAGER')` |
| PATCH | `/:id/escalate` | `requireRole('HR_MANAGER')` |
| PATCH | `/:id/notes` | `requireAuth` |
| PATCH | `/:id/archive` | `requireRole('HR_MANAGER')` |
| GET | `/:id/audit-logs` | `requireAuth` |

**Audit log replacements (5 calls):**
- All `performedByRole: body.xxx || 'HR_MANAGER'` → `req.user!.role`
- All `performedByUserId: body.xxx || null` → `req.user!.id`
- Removed `enteredByUserId` validation from POST handler; `enteredByUserId` now set from `req.user!.id`

### `server/routes/interviews.ts`

| Method | Route | Middleware Applied |
|--------|-------|--------------------|
| GET | `/` | `requireAuth` |
| POST | `/` | `requireRole('HR_ASSISTANT', 'HR_MANAGER')` |
| GET | `/:id` | `requireAuth` |
| PUT | `/:id` | `requireRole('HR_ASSISTANT', 'HR_MANAGER')` |
| PATCH | `/:id/result` | `requireAuth` |

**Audit log replacements (3 calls):**
- `performedByRole: b.performedByRole || 'HR_MANAGER'` → `req.user!.role`
- `performedByUserId: b.performedByUserId || null` → `req.user!.id`

### `server/routes/trainingCourses.ts`

| Method | Route | Middleware Applied |
|--------|-------|--------------------|
| GET | `/eligible/:jobVacancyId` | `requireAuth` |
| GET | `/` | `requireAuth` |
| GET | `/:id` | `requireAuth` |
| POST | `/` | `requireRole('HR_MANAGER')` |
| PATCH | `/:id/start` | `requireRole('HR_MANAGER')` |
| POST | `/:id/attendance` | `requireRole('HR_MANAGER')` |
| PATCH | `/:id/complete` | `requireRole('HR_MANAGER')` |
| PATCH | `/:id/trainees/:applicationId/result` | `requireRole('HR_MANAGER')` |
| POST | `/:id/trainees` | `requireRole('HR_MANAGER')` |

**Audit log replacements (7 calls):**
- All `performedByRole/performedByUserId` from body → `req.user!.role` / `req.user!.id`
- `created_by_user_id` in INSERT now uses `req.user!.id`
- `result_recorded_by` in UPDATE now uses `req.user!.id`
- `recorded_by_user_id` in attendance INSERT now uses `req.user!.id`

---

## M6 Frontend ✅

### New File: `src/lib/authFetch.ts`
- Drop-in `fetch()` replacement that attaches `Authorization: Bearer <token>` from `localStorage('hr_token')`
- Merges with caller-supplied headers (caller headers take precedence)

### New File: `src/hooks/useAuthStore.ts`
- Zustand store: `{ token, user, login(token, user), logout() }`
- Persists token + user object to `localStorage` on login; clears on logout
- Hydrates from localStorage on initialization

### New File: `src/pages/auth/Login.tsx`
- Route: `/login`
- Username + password form → `POST /api/auth/login`
- On success: calls `login(token, user)` and navigates to `/`
- Displays error message on failure
- Shows default dev credentials in the card footer

### Updated: `src/App.tsx`
- Added `ProtectedRoute` component: redirects to `/login` if no token in auth store
- Added `<Route path="/login" element={<Login />} />` (public)
- Wrapped `<Route element={<MainLayout />}>` with `<ProtectedRoute>`
- Added `Navigate` import from react-router-dom

### Updated: `src/layout/MainLayout.tsx`
- Added `useAuthStore` + `useNavigate` imports; added `LogOut` icon
- User profile section now shows `authUser.name` and role label in Arabic
- Avatar URL uses real user name
- Added logout button (LogOut icon) that calls `logout()` and navigates to `/login`
- Hides logout button when sidebar is collapsed

### Updated Stores (authFetch applied):
- `src/hooks/useVacancyStore.ts` — all `fetch(` → `authFetch(`
- `src/hooks/useApplicationListStore.ts` — all `fetch(` → `authFetch(`
- `src/hooks/useInterviewStore.ts` — all `fetch(` → `authFetch(`
- `src/hooks/useTrainingStore.ts` — all `fetch(` → `authFetch(`

### Updated Detail Pages (authFetch applied):
- `src/pages/jobs/ApplicationDetail.tsx` — all admin fetches → `authFetch`
- `src/pages/jobs/VacancyDetail.tsx` — all admin fetches → `authFetch`
- `src/pages/jobs/InterviewDetail.tsx` — all admin fetches → `authFetch`
- `src/pages/jobs/ManualApplicationEntry.tsx` — vacancies fetch + submission → `authFetch`; `enteredByUserId: 1` placeholder removed; `enteredByName` defaults to `authUser.name`

**Public routes untouched:** `/api/public/*`, `PublicJobs.tsx`, Login.tsx

---

## Summary

| # | Task | New Files | Updated Files | Result |
|---|------|-----------|---------------|--------|
| M6.1 | Investigate Auth | — | — | ✅ |
| M6.2 | Create Middleware + Login + Schema | `server/middleware/auth.ts`, `server/routes/auth.ts` | `server/schema.ts`, `server/index.ts` | ✅ |
| M6.3 | Apply Middleware + Audit Log Replacement | — | `vacancies.ts`, `adminApplications.ts`, `interviews.ts`, `trainingCourses.ts` | ✅ |
| M6.4 | Frontend Auth Layer | `src/lib/authFetch.ts`, `src/hooks/useAuthStore.ts`, `src/pages/auth/Login.tsx` | `App.tsx`, `MainLayout.tsx`, 4 stores, 4 detail pages, `ManualApplicationEntry.tsx` | ✅ |

---

**Phase M6 Complete — Ready**

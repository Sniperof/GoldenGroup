# Phase M5 — Completion Report

**Date Completed:** 2026-03-17
**Branch:** 1-emergency-triage-dispatch

---

## M5.1: Vacancy Detail Page ✅

### New File: `src/pages/jobs/VacancyDetail.tsx`

**What was done:**
- Fetches `GET /api/admin/vacancies/:id` for vacancy + stats (applicationsCount, hiredCount, remainingSlots).
- Fetches `GET /api/admin/applications?vacancyId=:id&isArchived=false` for linked applications.
- **Stats row**: 3 cards — إجمالي الطلبات, تم التوظيف, الشواغر المتبقية.
- **Info sections** (2-col grid):
  - المعلومات الأساسية (title, branch, workType, requiredGender, email, drivingLicenseRequired)
  - المتطلبات (qualification, specialization, experience, age range, skills, responsibilities)
  - الموقع (conditional — shown only if location data exists)
- **Sidebar**: التوقيت والعدد (dates, vacancyCount, maxRetrainingCount) + Conditional action buttons:
  - Open: Edit + Close
  - Closed: Edit + Reopen + Archive
  - Archived: Reopen (HR Manager)
- **Edit modal**: Full edit modal inline (same fields + tier-lock behavior as Vacancies.tsx); calls `PUT /api/admin/vacancies/:id` directly; re-fetches detail on success.
- **Applications mini table**: id, full name, stage badge, status badge, Eye button → `/jobs/applications/:id`.

### Updated: `src/pages/jobs/Vacancies.tsx`

**What was done:**
- Added `useNavigate`.
- Each table row is now `cursor-pointer` with `onClick={() => navigate('/jobs/vacancies/${v.id}')}`.
- Added Eye icon column before إجراءات.
- Action buttons wrapped in `onClick={e => e.stopPropagation()}` cells to prevent row-click conflict.

### Route registered in `src/App.tsx`:
```
<Route path="/jobs/vacancies/:id" element={<VacancyDetail />} />
```

**Test result:** ✅ PASS — clicking a vacancy row navigates to detail; stats display; edit modal saves; status changes work; applications table links to application detail.

---

## M5.2: Interview Detail Page ✅

### New File: `src/pages/jobs/InterviewDetail.tsx`

**What was done:**
- Fetches `GET /api/admin/interviews/:id` which returns nested `applicant` (12 fields) and `vacancy` (id, title, branch).
- **Section 1 — بيانات المقابلة**: type, number, interviewer, date, time, created_at, internalNotes.
- **Section 2 — بيانات المتقدم**: read-only — firstName, lastName, dob, governorate, cityOrArea, academicQualification, previousEmployment, yearsOfExperience, expectedSalary, computerSkills, foreignLanguages, drivingLicense.
- **Section 3 — بيانات الشاغر**: id, title, branch + link to `/jobs/vacancies/:id`.
- **Conditional actions** (sidebar):
  - `Interview Scheduled`: "تعديل المقابلة" + "تسجيل النتيجة"
  - Completed/Failed: read-only badge + "لا يمكن تعديل هذه المقابلة"
- **Edit modal**: calls `PUT /api/admin/interviews/:id`; validates date/time/interviewer; re-fetches on success.
- **Result modal**: Completed / Failed selector + notes textarea; calls `PATCH /api/admin/interviews/:id/result`.

### Updated: `src/pages/jobs/Interviews.tsx`

**What was done:**
- Added `useNavigate`.
- Each table row is now `cursor-pointer` with `onClick={() => navigate('/jobs/interviews/${iv.id}')}`.
- "تسجيل النتيجة" button cell uses `onClick={e => e.stopPropagation()}` to prevent row navigation.

### Route registered in `src/App.tsx`:
```
<Route path="/jobs/interviews/:id" element={<InterviewDetail />} />
```

**Test result:** ✅ PASS — clicking an interview row navigates to detail; three sections display correctly; edit saves; result records.

---

## M5.3: Manual Application Entry ✅

### New File: `src/pages/jobs/ManualApplicationEntry.tsx`

**Decision**: Created as a separate full page at `/jobs/applications/new` (not a modal) — the form is too large for a modal (mirrors the public form with additional admin fields).

**What was done:**
- On mount: fetches `GET /api/admin/vacancies?status=Open` to populate the vacancy selector.
- **إعدادات الطلب section** (admin-only fields):
  - Vacancy selector — shows Open vacancies with `title — branch` labels.
  - Submission type: Apply / Refer a Candidate.
  - Application source: Internal / External Platforms (only these two are allowed by admin endpoint).
  - Entered By Name: free text input (placeholder for logged-in user; sent as `enteredByName`; `enteredByUserId` hardcoded to `1` pending auth integration).
- **بيانات المتقدم section**: firstName, lastName, mobileNumber, secondaryMobile, dob, gender, maritalStatus, email, governorate, cityOrArea, subArea, neighborhood, detailedAddress.
- **المؤهلات والخبرة section**: academicQualification, yearsOfExperience, previousEmployment, expectedSalary, computerSkills, foreignLanguages, drivingLicense, applicantSegment.
- **بيانات المُعرّف section** (conditional — shown when submissionType = 'Refer a Candidate'): type, employeeId (conditional on type=Employee), fullName, lastName, mobileNumber, governorate, cityOrArea, referrerWork, referrerNotes.
- **Success screen**: shows application id, "عرض الطلب" → `/jobs/applications/:id`, "إدخال طلب جديد" resets form.
- Calls `POST /api/admin/applications`.

### Updated: `src/pages/jobs/Applications.tsx`

**What was done:**
- Added `Plus` import.
- Changed header from plain div to `flex items-center justify-between`.
- Added "إدخال طلب يدوي" button that navigates to `/jobs/applications/new`.

### Route registered in `src/App.tsx`:
```
<Route path="/jobs/applications/new" element={<ManualApplicationEntry />} />
```
Note: `/new` route is registered BEFORE `/:id` so it takes priority over the parametric route.

**Test result:** ✅ PASS — clicking "إدخال طلب يدوي" opens the form; vacancy selector shows open vacancies; referrer section appears on "Refer a Candidate"; submission to POST /api/admin/applications succeeds with correct payload; success screen links to new application.

---

## Summary

| # | Task | New Files | Updated Files | Result |
|---|------|-----------|---------------|--------|
| M5.1 | Vacancy Detail Page | VacancyDetail.tsx | Vacancies.tsx, App.tsx | ✅ |
| M5.2 | Interview Detail Page | InterviewDetail.tsx | Interviews.tsx, App.tsx | ✅ |
| M5.3 | Manual Application Entry | ManualApplicationEntry.tsx | Applications.tsx, App.tsx | ✅ |

---

**Phase M5 Complete — Ready**

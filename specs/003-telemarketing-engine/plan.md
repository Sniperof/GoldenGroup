# Implementation Plan: Telemarketing Engine

Build the end-to-end Telemarketing module connecting Candidates and Clients into a pipeline: Plan → Generate Call List → Call → Book Appointment.

## Proposed Changes

### Phase 1: Data Foundation — Types & Stores

---

#### [MODIFY] [types.ts](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/lib/types.ts)

Add the following new types and modify existing interfaces:

**New types:**
- `TaskListItem` — `{ id: string; entityType: 'candidate' | 'client'; entityId: number; name: string; mobile: string; addressText: string; geoUnitId: number | null; status: 'pending' | 'called' | 'booked'; callOutcome?: CallOutcome }`
- `TaskList` — `{ id: string; teamKey: string; date: string; items: TaskListItem[]; createdAt: string }`
- `CallOutcome` — `'no_answer' | 'busy' | 'rejected' | 'booked'`
- `CallLog` — `{ id: string; entityType: 'candidate' | 'client'; entityId: number; taskListId: string; teamKey: string; outcome: CallOutcome; notes: string; timestamp: string; calledBy: number }`
- `Appointment` — `{ id: string; entityType: 'candidate' | 'client'; entityId: number; customerName: string; customerAddress: string; customerMobile: string; teamKey: string; date: string; timeSlot: string; occupation: string; waterSource: string; notes: string; createdAt: string; createdBy: number }`
- `TimeSlot` config constant: `WORKING_HOURS = { start: 9, end: 17, slotMinutes: 60 }`

**Modified interfaces:**
- `Candidate`: Add `geoUnitId: number | null`
- `Client`: Add `occupation?: string` and `waterSource?: string`

---

#### [NEW] [useClientStore.ts](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/hooks/useClientStore.ts)

Create a Zustand store wrapping `StorageManager.load('clients', [])`:

- **State:** `clients: Client[]`
- **Actions:**
  - `loadClients()` — Load from storage
  - `updateClient(id, updates)` — Partial update + persist
  - `getLeads(contracts, visits)` — Computed: clients with no contracts and no visits (lifecycle = Lead)
- **Pattern:** Follow `useCandidateStore` / `useCollectionStore` conventions (Zustand `create`)

---

#### [NEW] [useTelemarketingStore.ts](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/hooks/useTelemarketingStore.ts)

Create a Zustand store managing the three telemarketing collections:

- **State:**
  - `taskLists: TaskList[]`
  - `appointments: Appointment[]`
  - `callLogs: CallLog[]`
- **Actions:**
  - `generateTaskList(teamKey, date, items)` — Upsert (replaces existing for same team/date)
  - `addCallLog(log)` — Push new log entry
  - `addAppointment(appointment)` — Creates appointment, validates no double-booking
  - `updateTaskListItemStatus(taskListId, itemId, status, outcome?)` — Mark item as called/booked
  - `getTaskList(teamKey, date)` — Selector
  - `getAppointmentsForTeamDate(teamKey, date)` — Selector
  - `getBookedSlots(teamKey, date)` — Returns Set of booked `timeSlot` strings
  - `getCallHistory(entityType, entityId)` — Returns all logs for entity
- **Persistence:** `StorageManager.save('telemarketing_taskLists', ...)`, etc.

---

#### [MODIFY] [useCandidateStore.ts](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/hooks/useCandidateStore.ts)

- Update `addCandidate` to accept and store `geoUnitId` from the candidate data.
- Ensure mock candidates include `geoUnitId` values (use existing geoUnit IDs from `defaultGeoUnits`).

---

#### [MODIFY] [AddCandidateModal.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/components/candidates/AddCandidateModal.tsx)

- In `handleSave`, pass the computed `candidateUnitId` (already computed on line ~155) as `geoUnitId: Number(candidateUnitId) || null` in the candidate data object.

---

### Phase 2: Marketing Operations Page

---

#### [NEW] [MarketingOperations.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/pages/MarketingOperations.tsx)

A dashboard page with two live data tables:

- **Table A: "Suggested Follow-up"**
  - Data source: `useCandidateStore` → filter candidates by `status === 'FollowUp'`
  - Columns: Name (firstName + nickname), Mobile, Address, Referral Source, Date Added
  - Uses existing `SmartTable` component

- **Table B: "Active Leads"**
  - Data source: `useClientStore` → filter using `getLifecycleStage` logic (clients with no contracts & no visits)
  - Columns: Name, Mobile, Neighborhood, Date Added
  - Uses existing `SmartTable` component

- **Header:** Title "عمليات التسويق", icon, KPI summary cards (count of follow-ups, count of leads, total potential customers)

---

#### [MODIFY] [App.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/App.tsx)

- Import `MarketingOperations`
- Add route: `<Route path="/marketing" element={<MarketingOperations />} />`
- **Fix existing bug:** Remove the duplicate `/telemarketer` route (line 63)

---

#### [MODIFY] [MainLayout.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/layout/MainLayout.tsx)

- Add "Marketing Operations" nav item to `navItems[]` before the Telemarketer entry:
  `{ path: '/marketing', label: 'عمليات التسويق', icon: Target }`
- Import `Target` from lucide-react

---

### Phase 3: The Planner (PlanOverview Upgrade)

---

#### [MODIFY] [PlanOverview.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/pages/planning/PlanOverview.tsx)

- **Replace `countLoad`** with `getMarketingLoad(assignment)`:
  - Counts candidates (`status === 'FollowUp'`, matching `geoUnitId`) + clients (lifecycle `Lead`, matching `neighborhood`)
  - Returns `{ candidates: number, clients: number, total: number }`
  - Import from `useCandidateStore` and `useClientStore`

- **Add [Generate Call List] button** on each team card (next to the existing "عرض المهام" button):
  - Visible only when team has a valid route assignment AND `getMarketingLoad.total > 0`
  - On click: calls `useTelemarketingStore.generateTaskList(teamKey, date, matchedItems)`
  - Shows success toast/badge: "تم إنشاء قائمة الاتصال (N عميل)"
  - Shows warning if no customers: "لا يوجد عملاء في هذا المسار"

- **Update load display** to show split count: "5 متابعة + 3 محتمل = 8 إجمالي"

---

### Phase 4: Telemarketer Workspace Rewrite

---

#### [MODIFY] [TelemarketerWorkspace.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/pages/TelemarketerWorkspace.tsx)

**Full rewrite** — Replace all mock data with real store integration. Preserve the existing 3-column visual pattern.

**New "Switchboard Layout":**

1. **Header Tabs**: Team selector tabs based on today's schedule (from `StorageManager.load('schedules')`). Each tab labeled by supervisor name.

2. **Left Panel — "Team Agenda"**:
   - Vertical timeline: 09:00 to 17:00, 8 hourly slots
   - Each slot shows: "Free" (green) or "Booked — CustomerName" (blue)
   - Data from `useTelemarketingStore.getAppointmentsForTeamDate(teamKey, date)`

3. **Main Panel — "Call List"**:
   - Data from `useTelemarketingStore.getTaskList(teamKey, date)`
   - Table columns: Name, Mobile, Address, Status badge (pending/called/booked)
   - Each row has a [📞 Call] button (disabled if no mobile)
   - Clicking [📞 Call] opens the Customer Context Card modal

---

### Phase 5: Call Experience & Booking

---

#### [NEW] [CustomerContextCard.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/components/telemarketing/CustomerContextCard.tsx)

A modal component opened when [📞 Call] is clicked:

- **Header**: Customer name, entity type badge (Candidate/Client), click-to-call phone numbers
- **Timeline**: Scrollable history from `useTelemarketingStore.getCallHistory(entityType, entityId)` showing all previous logs (Added → Called → Outcome), plus original candidate/client creation date
- **Action Buttons Row**: [No Answer] (amber), [Busy] (slate), [Reject] (red), [📅 Book Appointment] (emerald)
- **On action click**:
  - Creates a `CallLog` via `useTelemarketingStore.addCallLog()`
  - Updates the TaskList item status via `updateTaskListItemStatus()`
  - For [Reject]: updates candidate status to 'Junk' or marks client accordingly
  - For [📅 Book]: opens the Smart Booking Form (inline expand, not a new modal)

---

#### [NEW] [SmartBookingForm.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/components/telemarketing/SmartBookingForm.tsx)

Inline form within the CustomerContextCard:

- **Auto-filled** (read-only): Customer Name, Address, Team (from selected tab), Date (today)
- **Inputs:**
  - Time Slot: `<select>` showing only free slots (09:00, 10:00, ..., 16:00 minus already booked)
  - Occupation: text input
  - Water Source: select (e.g., 'شبكة المدينة', 'بئر', 'خزان', 'نهر')
  - Notes: textarea
- **Save action:**
  1. `useTelemarketingStore.addAppointment(...)` — with double-booking check
  2. `useClientStore.updateClient(id, { occupation, waterSource })` — if entity is a client
  3. `useTelemarketingStore.addCallLog(...)` — outcome = 'booked'
  4. `useTelemarketingStore.updateTaskListItemStatus(...)` — status = 'booked'
  5. Close modal, refresh agenda panel

---

## Verification Plan

### Manual Verification (Browser Testing)

> [!IMPORTANT]
> No automated test framework exists in this project. All verification is manual via browser, using `npm run dev`.

#### Test 1: Data Foundation
1. Run `npm run dev` and open the app
2. Navigate to "الأسماء المقترحة" (Candidates)
3. Create a new candidate with a specific neighborhood selected → verify `geoUnitId` is saved (check via browser DevTools → Application → Local Storage → `goldenCRM_candidates`)
4. Navigate to "سجل العملاء" (Clients) → verify clients load normally

#### Test 2: Marketing Operations Page
1. Navigate to "عمليات التسويق" (Marketing Operations) from sidebar
2. Verify Table A shows candidates with 'FollowUp' status (if any exist)
3. Verify Table B shows clients with 'Lead' lifecycle stage (no contracts or visits)
4. Create a candidate, mark as FollowUp → verify it appears in Table A

#### Test 3: Generate Call List
1. Navigate to "التخطيط اليومي → ملخص الخطة" (Plan Overview)
2. Ensure at least one team is scheduled and has a route assigned
3. Verify the load counter shows "X متابعة + Y محتمل"
4. Click [Generate Call List] → verify success message
5. Click again → verify it replaces (not duplicates)

#### Test 4: Telemarketer Workspace
1. Navigate to "المسوّق الهاتفي" (Telemarketer)
2. Verify team tabs appear based on today's schedule
3. Select a team that has a generated call list → verify items appear
4. Verify left panel shows 09:00–17:00 agenda with all slots "Free"

#### Test 5: Call Flow — No Answer / Busy / Reject
1. Click [📞 Call] on a customer → verify context card modal opens
2. Verify customer name, phone, and history timeline are shown
3. Click [No Answer] → verify modal closes, item marked as "called", and log is visible in history on re-opening
4. Repeat with [Busy] and [Reject]

#### Test 6: Booking an Appointment
1. Click [📞 Call] on a customer → click [📅 Book Appointment]
2. Verify the booking form shows auto-filled fields (Name, Address, Team, Date)
3. Select a free time slot (e.g., 10:00), enter Occupation and Water Source
4. Click Save → verify:
   - Appointment appears in Team Agenda (left panel shows "10:00 — Booked — CustomerName")
   - Customer is marked as "booked" in the call list
   - For Client entity: Open Client Profile → verify `occupation` and `waterSource` are saved
5. Try booking the same slot → verify it's unavailable in the dropdown

#### Test 7: End-to-End Flow
1. Create a candidate → mark as FollowUp
2. Set up a team schedule and route assignment covering the candidate's neighborhood
3. Generate Call List from PlanOverview
4. Open TelemarketerWorkspace → find the candidate in call list
5. Call → Book Appointment at 11:00
6. Verify: agenda shows booking, call log exists, customer status updated

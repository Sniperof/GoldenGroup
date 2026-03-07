# Feature Specification: Telemarketing Engine v2 Refinements

**Feature Branch**: `004-telemarketing-refinements`  
**Created**: 2026-02-26  
**Status**: Draft  
**Input**: User description: "Refinements to the Telemarketing Engine — UI restructuring, workflow corrections, workspace fixes, and contact management refactor."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Contact Management Refactor (Priority: P1)

The existing system stores a single `mobile` string on both `Client` and `Candidate`. In reality, a customer may have multiple phone numbers (personal mobile, spouse's phone, work landline, etc.). The telemarketer needs to call the right number and log results **per specific number**.

**Refactor Goal:**
- Replace the single `mobile` field on `Candidate` with the same `contacts: ContactEntry[]` array that `Client` already supports (the `ContactEntry` interface already exists in `types.ts`).
- Update all UI surfaces that render or capture phone numbers so they display a list of contacts rather than a single string.
- In the Telemarketer Workspace "Action Panel," log call outcomes **per selected contact number** (e.g., "Primary Mobile: No Answer", "Wife: Answered").

**Why this priority**: This is a data-model change that cascades throughout the entire system. Every other story depends on the contact array being in place first.

**Independent Test**: Add a candidate with 2 contacts → open workspace → place a call → verify the telemarketer can select which number was called and the outcome is recorded against that number.

**Acceptance Scenarios**:

1. **Given** a Candidate has 2 contacts (Personal, Wife), **When** a telemarketer opens the call card, **Then** both numbers are listed with their labels.
2. **Given** a telemarketer selects "Wife" and picks outcome "No Answer," **When** the call is saved, **Then** the CallLog records `contactLabel: 'Wife'` and the specific number dialed.
3. **Given** `AddCandidateModal` is opened, **When** a user adds a candidate, **Then** at least one contact entry is created with `isPrimary: true`.
4. **Given** a Client has an existing single `mobile` value and no `contacts` array, **When** the system loads this client, **Then** a backward-compatible fallback presents the legacy `mobile` as a single ContactEntry.

---

### User Story 2 — UI Restructuring: Marketing Operations as Sub-Tab (Priority: P2)

The "Marketing Operations" dashboard is currently a separate page at `/marketing`. The manager prefers to see it as a **Sub-Tab** alongside the existing operations tabs within the existing `OperationsTasks` / task pages (where Emergency, Dues, Periodic, etc. already live) rather than a standalone page.

**Why this priority**: This is a layout/navigation change that improves discoverability without changing underlying data logic.

**Independent Test**: Navigate to the Operations / Tasks section → verify "عمليات التسويق" appears as an additional tab → click it → verify the Marketing Operations KPI cards and tables render inside the existing page frame.

**Acceptance Scenarios**:

1. **Given** the user navigates to the Operations section, **When** the page loads, **Then** a new "عمليات التسويق" tab is visible alongside other task tabs (Emergency, Dues, etc.).
2. **Given** the user clicks "عمليات التسويق" tab, **When** the tab activates, **Then** the KPI cards and two SmartTables (Follow-Up Candidates + Active Leads) render inside the existing page layout.
3. **Given** the move is complete, **When** checking the sidebar, **Then** the standalone "عمليات التسويق" sidebar item is removed.
4. **Given** the `/marketing` route existed previously, **When** a user navigates to `/marketing`, **Then** the route is removed and no longer accessible (or redirects).

---

### User Story 3 — Telemarketer Assignment in Team Builder (Priority: P2)

Currently, each team consists of a Supervisor and a Technician. The manager also needs to assign one or more **Telemarketer(s)** to each team so the workspace knows who handles calls for that team.

**Why this priority**: The workspace can function without this (using a shared view), but assigning telemarketers enables proper scoping of who sees which call list.

**Independent Test**: Open Team Scheduler → create a team → verify a multi-select dropdown labeled "المسوّق الهاتفي" appears → select 2 telemarketers → save → reload → verify the selection persisted.

**Acceptance Scenarios**:

1. **Given** the Team Scheduler card is displayed, **When** the user looks at the card, **Then** a multi-select for "Telemarketer(s)" is visible below the Technician select.
2. **Given** the user selects 2 telemarketers from the dropdown, **When** saving the schedule, **Then** the `TeamSlot` data for that day includes the selected telemarketer IDs.
3. **Given** telemarketers are assigned, **When** the assigned telemarketer opens the workspace, **Then** only their assigned team's call list is shown (or their team is pre-selected).

---

### User Story 4 — Move "Generate Call List" to Team Details Modal (Priority: P2)

The `[Generate Call List]` button is currently on the main team card in `PlanOverview`. The manager wants to first review the targeted customer list before generating it. The button should instead appear inside the **Team Details Modal** (opened by clicking the team card), where the list of geo-matched customers is visible for review.

**Why this priority**: Usability improvement that adds a review step before list generation.

**Independent Test**: Open PlanOverview → click a team card → verify a modal opens showing geo-matched customers → click "Generate Call List" inside the modal → verify the TaskList is created.

**Acceptance Scenarios**:

1. **Given** a team card is clicked in PlanOverview, **When** the modal opens, **Then** it shows a list of all geo-matched Follow-Up candidates and Active Leads for that team's route.
2. **Given** the modal shows 5 targeted customers, **When** the manager clicks "Generate Call List," **Then** a TaskList with 5 items is created in `useTelemarketingStore`.
3. **Given** the modal is closed without generating, **When** looking at the main team card, **Then** no `[Generate Call List]` button is visible on the card itself (it only exists inside the modal).

---

### User Story 5 — Fixed Left-Panel Team Agenda in Workspace (Priority: P3)

The Team Agenda (daily appointment timeline) should be a **permanently visible left panel** in the Telemarketer Workspace, always showing 09:00–17:00 hourly slot blocks. Booked slots show the customer name; free slots are visually distinct.

**Why this priority**: Enhances spatial awareness for the telemarketer but is an additive UI improvement.

**Independent Test**: Open the workspace → verify the left panel shows 8 hourly slots (09:00-17:00) → book an appointment → verify the booked slot updates in real-time on the left panel.

**Acceptance Scenarios**:

1. **Given** the workspace is open, **When** a team is selected, **Then** a left-side agenda panel is always visible showing 8 hourly time blocks.
2. **Given** 2 appointments are booked for the team today, **When** viewing the agenda, **Then** those 2 slots show customer name and are highlighted; the remaining 6 are free.
3. **Given** the telemarketer books a new appointment via the action panel, **When** the save completes, **Then** the left agenda panel immediately reflects the new booking without a page reload.

---

### Edge Cases

- What happens when a candidate has zero contacts? → System must require at least one contact (with `isPrimary: true`) during creation.
- What happens when the manager generates a call list but no customers match the route? → Show a message: "لا يوجد عملاء متطابقين مع مسار هذا الفريق" and disable the button.
- What happens when a legacy Client has a `mobile` string but no `contacts` array? → A runtime fallback converts the `mobile` string into a single-entry `contacts` array for display.
- What happens if the telemarketer tries to book a slot that was just booked by someone else? → The `addAppointment` store method already throws on double-booking; show an error toast.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the single `mobile` field on `Candidate` with a `contacts: ContactEntry[]` array, using the existing `ContactEntry` interface.
- **FR-002**: System MUST provide a backward-compatible fallback that presents a legacy single `mobile` as a `ContactEntry` during display if the `contacts` array is empty/undefined.
- **FR-003**: System MUST update `AddCandidateModal` to capture at least one contact entry (with label, type, number, isPrimary, hasWhatsApp).
- **FR-004**: System MUST update the Telemarketer Workspace "Action Panel" to allow the telemarketer to select which contact number they called before recording an outcome.
- **FR-005**: System MUST extend the `CallLog` interface with `contactLabel` and `contactNumber` fields to record per-number call outcomes.
- **FR-006**: System MUST relocate the Marketing Operations view from the standalone `/marketing` page to a sub-tab inside the Operations/Tasks page.
- **FR-007**: System MUST remove the `/marketing` route and remove the sidebar "عمليات التسويق" link.
- **FR-008**: System MUST add a multi-select "Telemarketer(s)" dropdown to the `TeamSlot` in the Team Scheduler.
- **FR-009**: System MUST extend the `TeamSlot` interface with a `telemarketers: number[]` field.
- **FR-010**: System MUST move the `[Generate Call List]` button from the PlanOverview team card into a Team Details Modal.
- **FR-011**: The Team Details Modal MUST display the list of geo-matched customers before the manager generates them.
- **FR-012**: System MUST render a fixed Left Panel in the Telemarketer Workspace showing 8 hourly agenda blocks (09:00–17:00) for the active team.
- **FR-013**: The agenda panel MUST reactively update when a new appointment is booked.

### Key Entities

- **ContactEntry** *(existing)*: Represents a single phone number with metadata (type, label, isPrimary, hasWhatsApp, status). Already defined in `types.ts`.
- **Candidate** *(modified)*: Will gain `contacts: ContactEntry[]` and deprecate `mobile`.
- **TeamSlot** *(modified)*: Will gain `telemarketers: number[]`.
- **CallLog** *(modified)*: Will gain `contactLabel: string` and `contactNumber: string`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A telemarketer can see and select from multiple contact numbers for any customer within 2 seconds of opening the call card.
- **SC-002**: 100% of call logs contain the specific contact label and number that was dialed.
- **SC-003**: The Marketing Operations view loads successfully under the Operations tab without any standalone route remaining.
- **SC-004**: Managers can assign telemarketers to teams, and the assignment persists across page reloads.
- **SC-005**: The "Generate Call List" button is only accessible after reviewing the customer preview inside the modal.
- **SC-006**: The left-panel agenda in the workspace reflects all booked slots within 1 second of a new booking.

## Assumptions

- The existing `ContactEntry` interface is sufficient and does not need schema changes.
- `Client` already has `contacts?: ContactEntry[]` — only `Candidate` needs the refactor.
- The multi-select for telemarketers will filter from `defaultEmployees` where `role === 'telemarketer'`.
- The Team Details Modal is a new component; the current PlanOverview does not have one.
- The Operations/Tasks page has an existing tab structure that can accommodate a new tab.

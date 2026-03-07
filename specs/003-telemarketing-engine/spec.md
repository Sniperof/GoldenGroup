# Feature Specification: Telemarketing Engine

**Feature Branch**: `003-telemarketing-engine`  
**Created**: 2026-02-26  
**Status**: Draft  
**Input**: Build the end-to-end Telemarketing module — a multi-stage workflow that transforms "Suggested Names" (Follow-up candidates) and "Leads" (clients) into "Scheduled Appointments".

## Context

The Golden CRM currently has two unconnected data pools:
- **Candidates** (in `useCandidateStore`) with statuses like 'FollowUp', 'Suggested', etc.
- **Clients** (in localStorage via `StorageManager`) with lifecycle stages Lead, FOP, and OP (computed from contracts/visits).

There is also a **TelemarketerWorkspace** that uses entirely mock data and a **PlanOverview** page that shows team cards with a basic load counter. None of these are interconnected yet.

This feature connects them into a single pipeline: **Plan → Generate Call List → Call → Book Appointment**.

## Assumptions

- **Working hours**: 09:00–17:00, 60-minute appointment slots (8 slots per day per team).
- **Geographic matching**: Candidates will have a `geoUnitId` field for geo-matching to routes. Clients already have `neighborhood` (a geoUnit ID string).
- **Lifecycle stage for Clients**: The Lead/FOP/OP classification remains computed (not persisted), using the existing `getLifecycleStage` pattern.
- **"Generate Call List" button** is placed on the Plan Overview page (which already has team cards with load counts), not on TeamScheduler.
- **Occupation & Water Source**: Stored on both the `Appointment` entity (snapshot at booking time) and the `Client` entity (persistent profile update).
- **One TaskList per Team per Date**: Regenerating replaces the previous list. A customer can only appear in one active TaskList for a given date.
- **Call outcomes**: No Answer, Busy, Reject, Book Appointment.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Manager Views Marketing Operations Dashboard (Priority: P1)

As a Marketing Manager, I want to see a dashboard of all "Follow-up" candidates and "Lead" clients in one place so that I can prepare telemarketing campaigns.

**Why this priority**: This is the data source for the entire workflow. Without it, no call lists can be generated.

**Independent Test**: Navigate to the Marketing Operations page and verify that Table A shows candidates with status 'FollowUp' and Table B shows clients whose lifecycle stage is 'Lead'.

**Acceptance Scenarios**:

1. **Given** I navigate to "Marketing Operations", **When** the page loads, **Then** I see two live data tables: "Suggested Follow-up" (candidates with `status == 'FollowUp'`) and "Active Leads" (clients with lifecycle stage `Lead`).
2. **Given** I add a new candidate with status 'FollowUp' from another part of the system, **When** I return to Marketing Operations, **Then** the candidate appears in Table A without manual refresh.
3. **Given** a client has no visits and no contracts, **When** Marketing Operations loads, **Then** that client appears in the "Active Leads" table.

---

### User Story 2 — Manager Generates a Call List (Priority: P1)

As a Marketing Manager, I want to generate a call list for a specific team based on their assigned route so that the telemarketer knows exactly who to call.

**Why this priority**: This bridges the planning module and the telemarketing workspace. Without it, telemarketers have no work queue.

**Independent Test**: In the Plan Overview, click [Generate Call List] on a team card that has an assigned route, and verify a TaskList is created with the correct customers.

**Acceptance Scenarios**:

1. **Given** a team has a route assignment and there are candidates/clients geo-matched to that route, **When** I click [Generate Call List], **Then** a new TaskList is created containing those customers, assigned to the team and the current date.
2. **Given** a team has no route assignment, **When** I view the team card, **Then** the [Generate Call List] button is disabled or hidden.
3. **Given** I already generated a call list for the same team/date, **When** I click [Generate Call List] again, **Then** the previous list is replaced (not duplicated).

---

### User Story 3 — Telemarketer Sees Their Call List (Priority: P1)

As a Telemarketer, I want to open my workspace, select a team, and see the list of customers I need to call today.

**Why this priority**: The telemarketer's primary interface for doing their job.

**Independent Test**: Open TelemarketerWorkspace, select a team tab, and verify the call list shows the customers from the generated TaskList.

**Acceptance Scenarios**:

1. **Given** a TaskList exists for Team A on today's date, **When** I open TelemarketerWorkspace and select the Team A tab, **Then** I see the call list with customer names, phone numbers, and addresses.
2. **Given** no TaskList exists for the selected team/date, **When** I view the workspace, **Then** I see an empty state message.
3. **Given** I am on the workspace, **When** I look at the left panel, **Then** I see the "Team Agenda" — a vertical timeline from 09:00 to 17:00 showing booked and free slots.

---

### User Story 4 — Telemarketer Calls a Customer (Priority: P1)

As a Telemarketer, I want to click a [📞 Call] button on a customer row and see their full context card so that I can have an informed conversation.

**Why this priority**: Direct user value — the call flow is the core of the telemarketing operation.

**Independent Test**: Click [📞 Call] on a customer. Verify the Customer Context Card modal opens with the customer name, click-to-call numbers, interaction timeline, and action buttons.

**Acceptance Scenarios**:

1. **Given** I click [📞 Call] on a customer, **When** the modal opens, **Then** I see: Customer Name, clickable phone numbers, and a scrollable history timeline.
2. **Given** a customer has no previous call history, **When** I open their context card, **Then** the timeline shows "No previous interactions" with just the "Added" entry.
3. **Given** I am in the context card, **When** I see the action buttons, **Then** I can choose: [No Answer], [Busy], [Reject], or [📅 Book Appointment].

---

### User Story 5 — Telemarketer Logs a Call Outcome (Priority: P1)

As a Telemarketer, I want to record the result of each call so that the system tracks all interactions.

**Why this priority**: Essential for audit trail and follow-up planning.

**Independent Test**: Click [No Answer] on the context card and verify a CallLog entry is created for that customer.

**Acceptance Scenarios**:

1. **Given** I click [No Answer], **When** the action completes, **Then** a CallLog is saved with outcome 'no_answer', the modal closes, and the customer row is visually marked as processed.
2. **Given** I click [Busy], **When** the action completes, **Then** a CallLog is saved with outcome 'busy'.
3. **Given** I click [Reject], **When** the action completes, **Then** a CallLog is saved with outcome 'rejected', and the candidate/client status is updated accordingly.

---

### User Story 6 — Telemarketer Books an Appointment (Priority: P1)

As a Telemarketer, I want to book an appointment for a customer so that a field team can visit them.

**Why this priority**: This is the ultimate conversion goal of the entire telemarketing pipeline.

**Independent Test**: Click [📅 Book Appointment], fill the Smart Booking Form, save, and verify the appointment appears in the team agenda and the customer status is updated.

**Acceptance Scenarios**:

1. **Given** I click [📅 Book Appointment], **When** the booking form opens, **Then** Customer Name, Address, Team, and Date are auto-filled.
2. **Given** I select a Time Slot, enter Occupation and Water Source, **When** I click Save, **Then**: (a) An Appointment record is created. (b) The Team Agenda updates to show the booked slot. (c) The customer status transitions (Candidate 'FollowUp' → 'Contacted'; Client gains a scheduled visit). (d) A CallLog entry with outcome 'booked' is created. (e) The `occupation` and `waterSource` fields are saved on both the Appointment and the Client profile.
3. **Given** a slot is already booked at 10:00, **When** I try to book another appointment at 10:00 for the same team/date, **Then** that slot is shown as unavailable.

---

### Edge Cases

- **Empty Route**: A team card has a route assignment but zero candidates/clients match the geo zones. The [Generate Call List] button should show a warning: "No customers found in this route".
- **Missing Contact Info**: A candidate has no mobile number. The [📞 Call] button should be disabled with a tooltip: "No phone number available".
- **Concurrent Bookings**: Two telemarketers try to book the same slot. The system should prevent double-booking (first-come-first-served).
- **Date Boundary**: If a call list was generated for "today" but the user opens the workspace tomorrow, they should see "No list for today" (lists are date-bound).
- **Candidate vs. Client**: The call list may contain both candidates and clients. The context card should render appropriate fields for each entity type (candidates have `firstName`/`nickname`; clients have `name`).

---

## Requirements *(mandatory)*

### Functional Requirements

**Data Foundation (Phase 1)**

- **FR-001**: System MUST provide a centralized `useClientStore` (Zustand) that wraps client data from `StorageManager`, supporting reactive reads and writes.
- **FR-002**: System MUST provide a `useTelemarketingStore` (Zustand) managing three collections: `TaskLists`, `Appointments`, and `CallLogs`.
- **FR-003**: The `Candidate` interface MUST include a `geoUnitId: number | null` field for geographic route matching.

**Marketing Operations (Phase 1)**

- **FR-004**: System MUST provide a "Marketing Operations" page accessible from the sidebar navigation.
- **FR-005**: The page MUST display two live data tables: "Suggested Follow-up" (candidates where `status == 'FollowUp'`) and "Active Leads" (clients where lifecycle stage is `Lead`).
- **FR-006**: Both tables MUST pull from actual stores (no mock data).

**The Planner (Phase 2)**

- **FR-007**: The Plan Overview page MUST display a [Generate Call List] button on each team card that has a valid route assignment.
- **FR-008**: The `getMarketingLoad(routeGeoIds)` function MUST count actual candidates (status 'FollowUp') and clients (lifecycle 'Lead') whose `geoUnitId`/`neighborhood` matches the route's geo zones.
- **FR-009**: Clicking [Generate Call List] MUST create a `TaskList` record assigned to that team, date, and containing the matched customers. Regeneration replaces the existing list for the same team/date.

**Telemarketer Workspace (Phase 3)**

- **FR-010**: System MUST provide a TelemarketerWorkspace page with: (a) Header tabs for each team. (b) Left panel: "Team Agenda" vertical timeline (09:00–17:00, 60-min slots) showing booked/free status. (c) Main panel: "Call List" table from the generated TaskList.
- **FR-011**: Each call list item MUST have a single [📞 Call] button.

**Call Experience (Phase 4)**

- **FR-012**: Clicking [📞 Call] MUST open a "Customer Context Card" modal showing: Customer Name, clickable phone numbers, scrollable interaction history timeline, and action buttons.
- **FR-013**: Action buttons MUST include: [No Answer], [Busy], [Reject], [📅 Book Appointment].
- **FR-014**: Each action MUST create a `CallLog` entry with the outcome, timestamp, customer reference, and team/user reference.
- **FR-015**: Clicking [📅 Book Appointment] MUST open a "Smart Booking Form" with auto-filled customer/address/team/date and inputs for: Time Slot (select from free slots), Occupation, Water Source, and Notes.
- **FR-016**: Saving a booking MUST: create an `Appointment`, update the Team Agenda, update customer status, save `occupation`/`waterSource` to both Appointment and Client, and log the call as 'booked'.
- **FR-017**: The system MUST prevent double-booking the same time slot for the same team/date.

### Key Entities

- **TaskList**: A generated list of customers assigned to a specific team for a specific date.
- **Appointment**: A booked time slot linking a customer to a team, date, and time, with contextual fields (occupation, water source, notes).
- **CallLog**: A record of every call interaction, including outcome, timestamp, and notes.
- **Candidate** (extended): Existing entity with new `geoUnitId` field.
- **Client** (extended): Existing entity with new `occupation` and `waterSource` fields.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A manager can generate a call list for a team in under 3 clicks from the Plan Overview.
- **SC-002**: 100% of candidates with status 'FollowUp' and clients with lifecycle 'Lead' in a route's geo zones appear in the generated call list.
- **SC-003**: The telemarketer can complete a full call cycle (open card → select outcome → save) in under 30 seconds.
- **SC-004**: The appointment booking form auto-fills at least 4 fields (Customer, Address, Team, Date) without manual entry.
- **SC-005**: Zero double-bookings: no two appointments can occupy the same team/date/time slot.
- **SC-006**: 100% of call actions create a corresponding CallLog entry visible in the customer's timeline.
- **SC-007**: The Team Agenda accurately reflects all booked appointments in real-time after a booking is saved.
